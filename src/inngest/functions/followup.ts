import { inngest } from "../client";

/**
 * Skeleton for the follow-up cadence workflow.
 *
 * Triggered by `lead/scored` (warm/hot only). Steps through a configurable
 * cadence (e.g., 30min, 24h, 72h) sending email/SMS via Resend / Twilio.
 *
 * Pauses when an inbound reply is detected (handled by webhook receivers
 * emitting `lead/replied`).
 *
 * Full implementation lands Week 4 of the MVP roadmap.
 */
export const runFollowup = inngest.createFunction(
  {
    id: "run-followup",
    name: "Run follow-up cadence",
    retries: 2,
  },
  { event: "lead/scored" },
  async ({ event, step }) => {
    const { temperature, leadId, tenantId } = event.data;
    if (temperature === "cold") {
      return { skipped: true, reason: "cold lead" };
    }

    await step.sleep("wait-30min", "30m");
    await step.run("send-email-1", async () => {
      console.log(`[followup] would send email 1 for lead ${leadId}`);
    });

    await step.sleep("wait-24h", "24h");
    await step.run("send-sms-1", async () => {
      console.log(`[followup] would send sms 1 for lead ${leadId}`);
    });

    await step.sleep("wait-72h", "48h");
    await step.run("send-email-2", async () => {
      console.log(`[followup] would send email 2 for lead ${leadId}`);
    });

    return { ok: true, tenantId, leadId };
  },
);
