import { describeImage, fetchLatestFromTigris } from "@/app/utils";
import { S3Client } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export type TigrisObject = {
  displayName: string;
  key: string;
  urlSlug: string;
};

export type FilesResponse = Array<TigrisObject>;

export async function POST() {
  const url = (await fetchLatestFromTigris()) || "";
  console.log("url", url);
  const aiResponse = await describeImage(url);
  console.log(aiResponse);

  return Response.json(aiResponse);
}
