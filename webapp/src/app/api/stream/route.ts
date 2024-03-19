// Can be 'nodejs', but Vercel recommends using 'edge'
export const runtime = "nodejs";

// Prevents this route's response from being cached
export const dynamic = "force-dynamic";

import Redis from "ioredis";
import { NextRequest } from "next/server";

const redisSubscriber = new Redis(process.env.UPSTASH_REDIS_URL!);

const setKey = "ai-responses";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    start(controller) {
      redisSubscriber.subscribe(setKey, (err) => {
        if (err) console.log(err);
      });

      const messageHandler = (channel: string, message: string) => {
        console.log("redis message", message, channel);
        if (channel === setKey)
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      };

      redisSubscriber.on("message", messageHandler);

      redisSubscriber.on("end", () => {
        console.log("redis connection closed!!!");
        controller.close();
      });

      const cleanup = () => {
        console.log("Cleaning up...");
        redisSubscriber.off("message", messageHandler);
        redisSubscriber.unsubscribe();
        redisSubscriber.quit();
        controller.close();
      };

      // Handle stream closure
      redisSubscriber.on("end", cleanup);
    },
  });
  return new Response(customReadable, {
    headers: {
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
