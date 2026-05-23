import { eq } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { anthropic, MODELS } from "@/lib/ai/anthropic";

/**
 * On `lead/created`, score the lead 0–100 with Claude Haiku.
 * Triggers downstream events based on temperature.
 */
export const scoreLead = inngest.createFunction(
  {
    id: "score-lead",
    name: "Score new lead",
    retries: 2,
  },
  { event: "lead/created" },
  async ({ event, step }) => {
    const { leadId, tenantId } = event.data;

    const lead = await step.run("load-lead", async () => {
      const [r] = await db.select().from(leads).where(eq(leads.id, leadId));
      if (!r) throw new Error(`Lead ${leadId} not found`);
      return r;
    });

    const scoring = await step.run("ai-score", async () => {
      const res = await anthropic().messages.create({
        model: MODELS.fast,
        max_tokens: 256,
        system:
          "You score renovation leads 0-100 on likelihood to convert within 90 days. Output JSON only: {\"score\": number, \"temperature\": \"hot\"|\"warm\"|\"cold\", \"reason\": string}",
        messages: [
          {
            role: "user",
            content: `Score this lead:\n${JSON.stringify(
              {
                email: lead.email,
                phone: lead.phone,
                notes: lead.notes,
                source: lead.source,
                zip: lead.zip,
              },
              null,
              2,
            )}`,
          },
        ],
      });
      const text = res.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("");
      const json = JSON.parse(text);
      return json as { score: number; temperature: "hot" | "warm" | "cold"; reason: string };
    });

    await step.run("save-score", async () => {
      await db
        .update(leads)
        .set({
          score: scoring.score,
          temperature: scoring.temperature,
        })
        .where(eq(leads.id, leadId));
    });

    await step.sendEvent("emit-scored", {
      name: "lead/scored",
      data: {
        tenantId,
        leadId,
        score: scoring.score,
        temperature: scoring.temperature,
      },
    });

    return scoring;
  },
);
