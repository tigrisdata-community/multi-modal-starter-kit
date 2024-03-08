import { describeImage, fetchLatestFromTigris } from "@/app/utils";
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

    const url = result?.data.result;
    console.log("url", url);
    if (!!url) {
      // TODO - only send request to OAI if url hasn't been seen before.
      await step.run("describe-image", async () => {
        return await describeImage(url);
      });
    }
  }
);
