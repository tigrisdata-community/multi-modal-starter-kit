import { describeImage, fetchLatestFromTigris } from "@/utils/video";
import { notifyViaEmail } from "@/utils/email";
import { ratelimit } from "@/utils/ratelimit";
import { inngest } from "./client";

export const inngestTick = inngest.createFunction(
  { id: "tick" },
  { cron: "* * * * *" },
  async ({ step }) => {
    await step.run("fetch-latest-snapshot", async () => {
      return await fetchLatestFromTigris();
    });

    const result = await step.waitForEvent("Tigris.complete", {
      event: "Tigris.complete",
      timeout: "1m",
    });

    const url = result?.data.url;
    console.log("url", url);
    if (!!url) {
      // TODO - only send request to OAI if url hasn't been seen before.
      await step.run("describe-image", async () => {
        return await describeImage(url);
      });
    }
  }
);

export const sendEmail = inngest.createFunction(
  { id: "sendEmail", retries: 0 },
  { event: "aiResponse.complete" },
  async ({ event, step }) => {
    const { success } = await ratelimit.limit("sendEmail");
    if (success && event.data.message.detected === "TRUE") {
      console.log("sending an email!!");
      await notifyViaEmail(event.data.url, event.data.message.comment);
    }
  }
);
