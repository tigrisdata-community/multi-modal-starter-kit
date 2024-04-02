import {
  videoToFrames,
  downloadVideo,
  makeCollage,
  listTigrisDirectoryItems,
} from "@/utils/video";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  const data = await req.json();
  const videoUrl = data.url;
  const videoName = data.key;
  const tigrisCollagesDir = process.env.COLLAGE_FOLDER_NAME || "collages";

  const collagesDir: string = `${tigrisCollagesDir}/${videoName}`;
  console.log("collagesDir: ", collagesDir);
  const tigrisCollageContent = await listTigrisDirectoryItems(collagesDir);
  console.log("bucket contents: ", tigrisCollageContent);

  if (tigrisCollageContent.length > 0) {
    // collages already created
    await makeCollage(videoName, false);
  } else {
    // need to pre-process video
    const videoFilePath = await downloadVideo(videoUrl, videoName);

    // frames are stored temporarily in static/frames
    await videoToFrames(videoFilePath, videoName);

    await makeCollage(videoName, true);
  }

  return NextResponse.json("");
}
