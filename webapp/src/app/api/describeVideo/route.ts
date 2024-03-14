// Can be 'nodejs', but Vercel recommends using 'edge'
export const runtime = "nodejs";

// Prevents this route's response from being cached
export const dynamic = "force-dynamic";

import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  describeImageForVideo,
} from "@/utils/video";
import { write } from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextResponse) {
  const videoUrl: string = req.nextUrl.searchParams.get("url")!;
  const videoName: string = req.nextUrl.searchParams.get("key")!;
  console.log("videoUrl", videoUrl);

  let responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // const videoFilePath = await downloadVideo(videoUrl, videoName);

  // // frames are stored temporarily in webapp/static/frames
  // await videoToFrames(videoFilePath, videoName);

  // const collageUrls: string[] = await makeCollage(videoName);

  let context = "";
  let aiResponse = [];
  writer.write(encoder.encode("data: " + "1 " + "\n\n"));
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  await delay(2000);
  writer.write(encoder.encode("data: " + "2 " + "\n\n"));

  for (const collageUrl of [
    "https://cat-detector.fly.storage.tigris.dev/test-video.mp4/collage-2.jpg",
  ]) {
    const result = await describeImageForVideo(collageUrl, context);
    //TODO - should retry if OAI says it't can't help with the request
    aiResponse.push(result.content);
    writer.write(encoder.encode("data:" + result.content + " " + "\n\n"));
    context += result.content + " ";
  }
  writer.write(encoder.encode("done\n\n"));
  writer.close();
  // return NextResponse.json(aiResponse);

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
    },
  });
}
