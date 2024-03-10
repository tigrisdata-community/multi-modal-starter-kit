import { inngest } from "@/inngest/client";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import OpenAI from "openai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { EmailTemplate } from "@/components/emailTemplate";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});
const client = new S3Client();
const resend = new Resend(process.env.RESEND_API_KEY);

type LLMOutput = {
  detected: string;
  comment: string;
};

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

export async function describeImageForVideo(url: string) {
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
            You are an AI assistant that can help me describe a frame from a video. Please make it funny!
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
  return chatCompletion.choices[0].message;
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

export async function notifyViaEmail(url: string, message: string = "") {
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: [process.env.TO_EMAIL!],
    subject: "AI detection",
    react: EmailTemplate({ url, message }),
    html: "",
  });
}

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});
