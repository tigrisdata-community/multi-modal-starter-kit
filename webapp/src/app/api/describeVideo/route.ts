import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  describeImageForVideo,
  publishNotification,
} from "@/utils/video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  const data = await req.json();
  const videoUrl = data.url;
  const videoName = data.key;

  const videoFilePath = await downloadVideo(videoUrl, videoName);

  // frames are stored temporarily in webapp/static/frames
  await videoToFrames(videoFilePath, videoName);

  const collageUrls: string[] = await makeCollage(videoName);

  let context = "";
  let aiResponse = [];
  const setKey = "ai-responses";

  for (let index = 0; index < collageUrls.length; index++) {
    const result = await describeImageForVideo(collageUrls[index], context);
    await publishNotification(setKey, result.content || "");

    //TODO - should retry if OAI says it't can't help with the request
    aiResponse.push(result.content);
    context += result.content + " ";
    if (index === collageUrls.length - 1) {
      await publishNotification("ai-responses", "END");
    }
  }
  return NextResponse.json(aiResponse);
}
