import { inngest } from "@/inngest/client";
import {
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import OpenAI from "openai";

import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import ollama from "ollama";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

const openai = new OpenAI({
  // baseURL: "http://localhost:11434/v1",
  // apiKey: "ollama",
  apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});
const client = new S3Client();
const useOllama = process.env.USE_OLLAMA === "true";

//TODO - for debugging
//const tmpDir = path.join(process.cwd(), "static", "tmp");

const framesDir = path.join(process.cwd(), "static", "frames");
const videoDir = path.join(process.cwd(), "static", "video");
const frameRate = 10;

type LLMOutput = {
  detected: string;
  comment: string;
};

export async function downloadVideo(url: string, videoName: string) {
  const filePath = path.join(videoDir, videoName);
  if (fs.existsSync(filePath)) {
  } else {
    fs.existsSync(videoDir) || fs.mkdirSync(videoDir, { recursive: true });
    const response = await fetch(url);
    const buffer = await response.buffer();

    try {
      fs.writeFileSync(filePath, buffer);
    } catch (e) {
      console.error(e);
    }
    console.log("video downloaded: ", filePath);
  }
  return filePath;
}

export async function videoToFrames(filePath: string, videoName: string) {
  const framesFullPath = path.join(framesDir, videoName);
  if (!fs.existsSync(framesFullPath)) {
    fs.mkdirSync(framesFullPath, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions([`-vf fps=1/${frameRate}`, `-vsync 0`, `-frame_pts 1`])
      .output(`${framesFullPath}/frame-%04d.png`)
      .on("end", () => {
        console.log("Frame extraction completed.");
        resolve("Done");
      })
      .on("progress", (progress) => {
        console.log(`Processing video: ${progress.percent}% done`);
      })
      .on("error", (err) => {
        console.error(`Error processing video: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

export async function makeCollage(videoName: string) {
  const framesFullPath = path.join(framesDir, videoName);
  const files = fs.readdirSync(framesFullPath);
  let result: string[] = [];
  for (let i = 0; i < files.length; i += 6) {
    const batch = files.slice(i, i + 6);
    const collageUrl = await createCollage(batch, Math.floor(i / 6), videoName);
    console.log("collageUrl", collageUrl);
    result.push(collageUrl);
  }
  return result;
}

export async function createCollage(
  framesBatch: string[],
  batchIndex: number,
  videoName: string,
  collageFromCapture: boolean = false // If true, the collage is created from the capture and frames are base64
) {
  const collageWidth = 600; // Width of one image in the collage
  const collageHeight = 400; // Height of one image in the collage

  let collage = sharp({
    create: {
      width: collageWidth * 3, // 3 images per row
      height: collageHeight * 2, // 2 rows
      channels: 4,
      background: "white",
    },
  });

  const composites = await Promise.all(
    framesBatch.map(async (frame, index) => {
      let resizedImage;
      if (collageFromCapture) {
        const base64Data = frame.split(";base64,").pop();
        if (!base64Data) {
          throw new Error("Invalid Base64 image data");
        }
        const imageBuffer = Buffer.from(base64Data, "base64");
        resizedImage = await sharp(imageBuffer)
          .resize({
            width: collageWidth,
            fit: "cover",
          })
          .toBuffer();
      } else {
        const imagePath = path.join(framesDir, videoName, frame);

        resizedImage = await sharp(imagePath)
          .resize({
            width: collageWidth,
            fit: "cover",
          })
          .toBuffer();
      }

      return {
        input: resizedImage,
        top: Math.floor(index / 3) * collageHeight,
        left: (index % 3) * collageWidth,
      };
    })
  );

  collage = collage.composite(composites);
  const collageBuffer = await collage.jpeg().toBuffer();
  const collageTs = Date.now();

  const collageUrl = collageFromCapture
    ? `https://${process.env.NEXT_PUBLIC_BUCKET_NAME}.fly.storage.tigris.dev/${videoName}/capture/${collageTs}.jpg`
    : `https://${process.env.NEXT_PUBLIC_BUCKET_NAME}.fly.storage.tigris.dev/${videoName}/collage-${batchIndex + 1}.jpg`;

  const tigrisParam = {
    Bucket: process.env.NEXT_PUBLIC_BUCKET_NAME!,
    Key: collageFromCapture
      ? `${videoName}/capture/${collageTs}.jpg`
      : `${videoName}/collage-${batchIndex + 1}.jpg`,
    Body: collageBuffer,
    ContentType: "image/jpeg",
  };

  // For testing locally
  // collage.toFile(path.join(frameCollageDir, `collage-${batchIndex + 1}.jpg`));

  try {
    await client.send(new PutObjectCommand(tigrisParam));
    console.log("Collage saved to Tigris: ", collageUrl);
  } catch (e) {
    console.error("Failed to save collage: ", e);
  }
  return collageUrl;
}

export async function fetchLatestFromTigris() {
  const listObjectsV2Command = new ListObjectsV2Command({
    Bucket: process.env.NEXT_PUBLIC_BUCKET_NAME,
    Prefix: process.env.COLLAGE_FOLER_NAME
      ? `${process.env.COLLAGE_FOLER_NAME!}/`
      : "",
  });
  const resp = await client.send(listObjectsV2Command);
  if (!resp.Contents || resp.Contents.length === 0) {
    console.log("No files found.");
    return;
  }

  const latestFile = resp.Contents.sort(
    (a: any, b: any) => b.LastModified - a.LastModified
  )[0];

  if (!latestFile) {
    console.log("No file found.");
    return;
  }

  const getObjectCommand = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: latestFile.Key,
  });

  const url = await getSignedUrl(client, getObjectCommand);
  inngest.send({
    name: "Tigris.complete",
    data: { url },
  });
  return url;
}

function isValidLLMOutput(output: string): boolean {
  try {
    const data: LLMOutput = JSON.parse(output);

    // Check if the required fields are present and are of type string
    if (typeof data.detected === "string" && typeof data.comment === "string") {
      return true;
    }
    return false;
  } catch (e) {
    // If JSON parsing fails or any other error occurs
    console.error(e);
    return false;
  }
}

// Old promopt:
//
// You are an AI assistant that can help me describe a frame from a video. Please make it funny!
//
//
//    text: `These are frames a camera stream consist of one to many pictures.
//    Generate a compelling description of the image or a sequence of images.
//    Previously you have described other frames from the same video, here is what you said: ${context}.
//
//    Make your description unique and not repetitive please!.

export default async function toBase64ImageUrl(
  imgUrl: string
): Promise<string> {
  const fetchImageUrl = await fetch(imgUrl);
  const responseArrBuffer = await fetchImageUrl.arrayBuffer();
  //data:${fetchImageUrl.headers.get("Content-Type") || "image/png"};base64,$
  const toBase64 = `${Buffer.from(responseArrBuffer).toString("base64")}`;
  return toBase64;
}

export async function describeImageForVideo(url: string, context: string = "") {
  const systemPrompt: ChatCompletionMessageParam = {
    role: "system",
    content: `
      You are a teenager who is always making fun of people and things, and saying gross, juevenile stuff.
      `,
  };

  if (useOllama) {
    const response = await ollama.chat({
      model: "llava",
      messages: [
        systemPrompt,
        {
          role: "user",
          content: `These are frames from an old science fiction movie with one or more pictures. 
          Generate a funny description of the image or a sequence of images.  Really roast the movie.
          Previously you have described other frames from the same video, here is what you said: ${context}. 
          
          Make your description unique and not repetitive please!. Also, please keep it to only a few sentances.`,
          images: [await toBase64ImageUrl(url)],
        },
      ],
    });

    return response.message;
  } else {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        systemPrompt,
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `These are frames from an old science fiction movie with one or more pictures. 
          Generate a funny description of the image or a sequence of images.  Really roast the movie.
          Previously you have described other frames from the same video, here is what you said: ${context}. 
          
          Make your description unique and not repetitive please!. Also, please keep it to only a few sentances.
  
          "`,
            },
            {
              type: "image_url",
              image_url: { url: url },
            },
          ],
        },
      ],
      model: "gpt-4-vision-preview",
      max_tokens: 2048,
    });
    console.log("AI Response: ", chatCompletion.choices[0].message.content);
    return chatCompletion.choices[0].message;
  }
}

export async function describeImage(url: string) {
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
              You are an AI assistant that can help me detect if there is a cat sitting on the cat bed and add an elaborate comment describing what you see. Please make it funny!
              ONLY reply a JSON format with the following structure. Make sure the JSON can be parsed by directedly passing into JSON.parse():              
              "{detected: 'TRUE', comment: '[add description of what you are seeing]'}"

              DO NOT include any other information before OR after the JSON. ONLY return a JSON object.
           `,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `These are frames a camera stream consist of one to many pictures. Generate a compelling description of the image or a sequence of images: "`,
          },
          {
            type: "image_url",
            image_url: { url: url },
          },
        ],
      },
    ],
    model: "gpt-4-vision-preview",
    max_tokens: 2048,
  });
  const content = chatCompletion.choices[0].message.content;
  console.log("AI Response", content);

  if (isValidLLMOutput(content || "")) {
    const result = { message: JSON.parse(content!), url, ts: Date.now() };

    inngest.send({
      name: "aiResponse.complete",
      data: { ...result },
    });

    return result;
  } else {
    // inngest will auto retry
    throw new Error("OpenAI response does not conform to the expected format.");
  }
}
