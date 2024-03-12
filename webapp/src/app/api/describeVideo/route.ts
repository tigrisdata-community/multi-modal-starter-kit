import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  describeImageForVideo,
} from "@/utils/video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  const data = await req.json();
  const videoUrl = data.url;
  const videoName = data.key;
  // console.log("videoUrl", videoUrl);

  const videoFilePath = await downloadVideo(videoUrl, videoName);

  // frames are stored temporarily in webapp/static/frames
  await videoToFrames(videoFilePath, videoName);

  const collageUrls: string[] = await makeCollage(videoName);

  let context = "";
  let aiResponse = [];
  for (const collageUrl of collageUrls) {
    const result = await describeImageForVideo(collageUrl, context);
    //TODO - should retry if OAI says it't can't help with the request
    aiResponse.push(result.content);
    context += result.content + " ";
  }
  return NextResponse.json(aiResponse);
}
