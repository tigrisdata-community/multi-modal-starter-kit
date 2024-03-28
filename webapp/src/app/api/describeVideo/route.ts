import { videoToFrames, downloadVideo, makeCollage } from "@/utils/video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  const data = await req.json();
  const videoUrl = data.url;
  const videoName = data.key;

  const videoFilePath = await downloadVideo(videoUrl, videoName);

  // frames are stored temporarily in webapp/static/frames
  await videoToFrames(videoFilePath, videoName);

  const collageUrls: string[] = await makeCollage(videoName);

  return NextResponse.json("");
}
