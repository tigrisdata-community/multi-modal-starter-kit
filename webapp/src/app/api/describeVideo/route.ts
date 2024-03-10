import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  describeImageForVideo,
} from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  const data = await req.json();
  const videoUrl = data.url;
  const videoName = data.key;
  // console.log("videoUrl", videoUrl);

  const videoFilePath = await downloadVideo(videoUrl);

  // frames are stored temporarily in webapp/static/frames
  await videoToFrames(videoFilePath);

  const collageUrls: string[] = await makeCollage(videoName);

  let context = "";
  let aiResponse = [];
  for (const collageUrl of collageUrls) {
    const result = await describeImageForVideo(collageUrl);
    aiResponse.push(result.content, context);
    context += result.content + " ";
  }
  return NextResponse.json(aiResponse);
}
