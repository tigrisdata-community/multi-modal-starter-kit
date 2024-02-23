import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

const client = new S3Client();

export async function GET() {
  const listObjectsV2Command = new ListObjectsV2Command({Bucket: process.env.BUCKET_NAME});
  const resp = await client.send(listObjectsV2Command);
  console.log(resp.Contents);
  return Response.json([{"name": "file1", "id": "f_123"}])
}
