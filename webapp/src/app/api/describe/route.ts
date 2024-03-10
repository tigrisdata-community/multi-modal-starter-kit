import { describeImageForVideo } from "@/app/utils";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const videoUrl = (await req.json())["frame"];
  console.log("querying openai for narration");
  const aiResponse = await describeImageForVideo(videoUrl);
  return new Response(aiResponse.content);
}
