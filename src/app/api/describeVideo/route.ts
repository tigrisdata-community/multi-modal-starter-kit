import { InferencePlatform } from "@/app/actions";
import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  listTigrisDirectoryItems,
} from "@/utils/video";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, res: NextResponse) {
  const data = await req.json();
  const videoUrl = data.url;
  const videoName = data.key;
  const modelName = data.modelName;
  const inferencePlatform = data.inferencePlatform as InferencePlatform
  const tigrisCollagesDir = process.env.COLLAGE_FOLDER_NAME || "collages";

  const collagesDir: string = `${tigrisCollagesDir}/${videoName}`;
  console.log("collagesDir: ", collagesDir);
  const tigrisCollageContent = await listTigrisDirectoryItems(collagesDir);
  console.log("bucket contents: ", tigrisCollageContent);

  if (tigrisCollageContent.length > 0) {
    // collages already created
    await makeCollage(videoName, false, inferencePlatform, modelName);
  } else {
    // need to pre-process video
    const videoFilePath = await downloadVideo(videoUrl, videoName);

    // frames are stored temporarily in static/frames
    await videoToFrames(videoFilePath, videoName);

    await makeCollage(videoName, true, inferencePlatform, modelName);
  }

  return NextResponse.json("");
}
