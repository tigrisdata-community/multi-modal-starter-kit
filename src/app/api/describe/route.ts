import { describeImageForVideo, createCollage } from "@/utils/video";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const request = await req.json();
  const videoUrls = request["frames"];
  const modelName = request["modelName"];
  const inferencePlatform = request["inferencePlatform"];
  const collageUrl = await createCollage(videoUrls, 0, "test-video-name", true);
  const aiResponse: any = await describeImageForVideo(
    collageUrl,
    "",
    inferencePlatform,
    modelName
  );
  return new Response(aiResponse.content + "COLLAGE_URL:" + collageUrl);
}
