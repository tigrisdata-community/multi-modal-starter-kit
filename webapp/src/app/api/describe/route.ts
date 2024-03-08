import { describeImage } from "@/app/utils";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const frame = (await req.json())["frame"];
  const imageUrl = `data:image/jpeg;base64,${frame}`;
  //https://dam.northwell.edu/m/4f123f9ef2ebbc64/Drupal-TheWell_coronavirus-stay-at-home_GettyImages-1085009306.jpg
  const aiResponse = await describeImage(imageUrl);
  // console.log(aiResponse);
  return new Response(aiResponse.content);
}
