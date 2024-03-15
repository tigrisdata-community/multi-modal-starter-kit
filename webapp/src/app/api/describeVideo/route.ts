// Can be 'nodejs', but Vercel recommends using 'edge'
export const runtime = "nodejs";

// Prevents this route's response from being cached
export const dynamic = "force-dynamic";

import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  describeImageForVideo,
  publishNotification,
} from "@/utils/video";
import { write } from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";
// Use ioredis to subscribe
import Redis from "ioredis";
const redisSubscriber = new Redis(process.env.UPSTASH_REDIS_URL!);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const setKey = "ai-responses";

export async function GET(req: NextRequest) {
  const videoUrl: string = req.nextUrl.searchParams.get("url")!;
  const videoName: string = req.nextUrl.searchParams.get("key")!;

  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    start(controller) {
      redisSubscriber.subscribe(setKey, (err) => {
        if (err) console.log(err);
      });

      redisSubscriber.on("message", (channel, message) => {
        console.log("redis message", message, channel);
        if (channel === setKey)
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      });
      redisSubscriber.on("end", () => {
        controller.close();
      });
    },
  });

  // const videoFilePath = await downloadVideo(videoUrl, videoName);

  // // frames are stored temporarily in webapp/static/frames
  // await videoToFrames(videoFilePath, videoName);

  // const collageUrls: string[] = await makeCollage(videoName);
  await publishNotification(setKey, "Start!");

  let context = "";
  let aiResponse = [];

  for (const collageUrl of [
    "https://cat-detector.fly.storage.tigris.dev/test-video.mp4/collage-2.jpg",
  ]) {
    const result = await describeImageForVideo(collageUrl, context);
    await publishNotification(setKey, result.content || "");
    aiResponse.push(result.content);
    context += result.content + " ";
  }

  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

// export async function GET(req: NextRequest, res: NextResponse) {

//   const encoder = new TextEncoder();
//   const customReadable = new ReadableStream({
//     start(controller) {
//       const message = "Hey, I am a message.";
//       controller.enqueue(encoder.encode(`data: ${message}\n\n`));
//     },
//   });
//   console.log("videoUrl", videoUrl);

//   // return NextResponse.json(aiResponse);

//   return new Response(customReadable, {
//     headers: {
//       Connection: "keep-alive",
//       "Content-Encoding": "none",
//       "Cache-Control": "no-cache, no-transform",
//       "Content-Type": "text/event-stream; charset=utf-8",
//     },
//   });
// }
