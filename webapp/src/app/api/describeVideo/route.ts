import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  describeImageForVideo,
  publishNotification,
} from "@/utils/video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  // const data = await req.json();
  // const videoUrl = data.url;
  // const videoName = data.key;

  // const videoFilePath = await downloadVideo(videoUrl, videoName);

  // // frames are stored temporarily in webapp/static/frames
  // await videoToFrames(videoFilePath, videoName);

  // const collageUrls: string[] = await makeCollage(videoName);

  let context = "";
  let aiResponse = [];
  const setKey = "ai-responses";

  //TODO - fix this file when you are ready to commit! this hardcoded list is for testing only. DO NOT MERGE this.
  for (const collageUrl of [
    "https://cat-detector.fly.storage.tigris.dev/test-video.mp4/collage-2.jpg",
    "https://cat-detector.fly.storage.tigris.dev/test-video.mp4/collage-1.jpg",
  ]) {
    const result = await describeImageForVideo(collageUrl, context);
    await publishNotification(setKey, result.content || "");
    //TODO - should retry if OAI says it't can't help with the request
    aiResponse.push(result.content);
    context += result.content + " ";
  }
  return NextResponse.json(aiResponse);
}
