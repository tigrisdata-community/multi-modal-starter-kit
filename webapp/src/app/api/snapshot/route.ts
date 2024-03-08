import { describeImage, fetchLatestFromTigris } from "@/app/utils";
import { inngest } from "@/inngest/client";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
const client = new S3Client();

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
  // if (aiResponse.content === "FALSE") {
  //   await inngest.send({
  //     name: "test/hello.world",
  //     data: {
  //       email: "testingAIresponse",
  //     },
  //   });
  // }

  return Response.json(aiResponse);
}
