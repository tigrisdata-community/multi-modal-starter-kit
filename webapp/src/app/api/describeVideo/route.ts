import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  describeImageForVideo,
  publishNotification,
} from "@/utils/video";
import { NextRequest, NextResponse } from "next/server";
// Use ioredis to subscribe

const setKey = "ai-responses";

export async function POST(req: NextRequest) {
  const request = await req.json();
  const { videoUrl, videoName } = request;
  // const videoFilePath = await downloadVideo(videoUrl, videoName);

  // // frames are stored temporarily in webapp/static/frames
  // await videoToFrames(videoFilePath, videoName);

  // const collageUrls: string[] = await makeCollage(videoName);

  let context = "";
  let aiResponse = [];

  await publishNotification(setKey, "Starting to describe video");

  for (const collageUrl of [
    "https://cat-detector.fly.storage.tigris.dev/test-video.mp4/collage-2.jpg",
  ]) {
    const result = await describeImageForVideo(collageUrl, context);
    await publishNotification(setKey, result.content || "");
    aiResponse.push(result.content);
    context += result.content + " ";
  }

  return NextResponse.json(aiResponse);
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
