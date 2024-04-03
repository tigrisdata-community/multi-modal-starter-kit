"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Redis } from "@upstash/redis";

const client = new S3Client();
const redis = Redis.fromEnv();

export async function getModelName() {
  return process.env.USE_OLLAMA === "true" ? "Ollama (LLaVA)" : "OpenAI";
}

export async function fetchAndPlayTextToSpeech(
  narrationText: string,
  videoName: string
) {
  console.log("current narration", narrationText);
  const cachedResult = await redis.get(narrationText);
  if (cachedResult) {
    console.log("cached result", cachedResult);
    return cachedResult;
  }

  if (!isEmpty(process.env.XI_API_KEY)) {
    // Narrate with 11 labs

    const escapestr = addslashes(narrationText);
    const options = {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.XI_API_KEY!,
      },
      body: '{"model_id":"eleven_turbo_v2","text":"' + escapestr + '"}',
    };

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.XI_VOICE_ID!}`,
        options
      );
      if (response.status !== 200) {
        console.error(
          "Unable to create elevenlabs audio. Error: " +
            JSON.stringify(await response.json())
        );
        return;
      }

      const blob = await response.blob();
      const ts = new Date().getTime();
      const audioFileSavedAt = `elevenLabsAudio/${videoName}/${ts}.mp3`;
      const arrayBuffer = await blob.arrayBuffer();
      const tigrisParam = {
        Bucket: process.env.NEXT_PUBLIC_BUCKET_NAME!,
        Key: audioFileSavedAt,
        Body: Buffer.from(arrayBuffer),
        ContentType: "audio/mpeg",
      };

      // For testing locally
      // collage.toFile(path.join(frameCollageDir, `collage-${batchIndex + 1}.jpg`));

      try {
        await client.send(new PutObjectCommand(tigrisParam));
        const url = `https://${process.env.NEXT_PUBLIC_BUCKET_NAME}.fly.storage.tigris.dev/${audioFileSavedAt}`;
        await redis.set(narrationText, url);
        console.log("Audio saved to Tigris: ", url);
        return url;
      } catch (e) {
        console.error("Failed to save collage: ", e);
      }
    } catch (err) {
      console.error("Error fetching text-to-speech:", err);
    }
  } // end if Narrate with 11 labs
}

function isEmpty(val: string | undefined | null) {
  return val === undefined || val == null || val.length <= 0 ? true : false;
}

// Remove all " and ' when passing to eleven labs.
function addslashes(str: string) {
  return (str + "")
    .replaceAll('"', "")
    .replaceAll("'", "")
    .replaceAll("\n", "");
}
