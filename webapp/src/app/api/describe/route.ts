import { describeImageForVideo, createCollage } from "@/utils/video";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const videoUrls = (await req.json())["frames"];
  const collageUrl = await createCollage(videoUrls, 0, "test-video-name", true);
  const aiResponse = await describeImageForVideo(collageUrl);
  return new Response(aiResponse.content);
}
