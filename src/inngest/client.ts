import { EventSchemas, Inngest } from "inngest";
import { z } from "zod";

const events = {
  "lead/created": {
    data: z.object({
      tenantId: z.string().uuid(),
      leadId: z.string().uuid(),
      source: z.string().optional(),
    }),
  },
  "lead/scored": {
    data: z.object({
      tenantId: z.string().uuid(),
      leadId: z.string().uuid(),
      score: z.number(),
      temperature: z.enum(["hot", "warm", "cold"]),
    }),
  },
  "render/requested": {
    data: z.object({
      tenantId: z.string().uuid(),
      renderId: z.string().uuid(),
      photoId: z.string().uuid(),
      styleId: z.string().uuid().optional(),
      promptJson: z.record(z.unknown()).optional(),
      leadId: z.string().uuid().optional(),
    }),
  },
  "render/completed": {
    data: z.object({
      tenantId: z.string().uuid(),
      renderId: z.string().uuid(),
      outputR2Key: z.string(),
      durationMs: z.number(),
    }),
  },
  "scope/extracted": {
    data: z.object({
      tenantId: z.string().uuid(),
      leadId: z.string().uuid(),
      scopeId: z.string().uuid(),
    }),
  },
  "proposal/sent": {
    data: z.object({
      tenantId: z.string().uuid(),
      proposalId: z.string().uuid(),
      leadId: z.string().uuid(),
    }),
  },
  "followup/due": {
    data: z.object({
      tenantId: z.string().uuid(),
      runId: z.string().uuid(),
      leadId: z.string().uuid(),
      step: z.number(),
    }),
  },
  "review/requested": {
    data: z.object({
      tenantId: z.string().uuid(),
      leadId: z.string().uuid(),
    }),
  },
};

export const inngest = new Inngest({
  id: "renovateai",
  schemas: new EventSchemas().fromZod(events),
});

export type AppEvents = typeof events;
