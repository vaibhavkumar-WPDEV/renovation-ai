import { eq } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/db/client";
import { renders, photoUploads } from "@/db/schema";
import { runRenderPipeline } from "@/lib/render/pipeline";

export const processRender = inngest.createFunction(
  {
    id: "process-render",
    name: "Process render job",
    concurrency: { limit: 50, key: "event.data.tenantId" },
    retries: 2,
  },
  { event: "render/requested" },
  async ({ event, step }) => {
    const { renderId, tenantId, photoId } = event.data;

    const { render, photo } = await step.run("load-render", async () => {
      const [r] = await db.select().from(renders).where(eq(renders.id, renderId));
      if (!r) throw new Error(`Render ${renderId} not found`);

      const [p] = await db.select().from(photoUploads).where(eq(photoUploads.id, photoId));
      if (!p) throw new Error(`Photo ${photoId} not found`);

      return { render: r, photo: p };
    });

    await step.run("mark-processing", async () => {
      await db
        .update(renders)
        .set({ status: "processing" })
        .where(eq(renders.id, renderId));
    });

    const promptJson = render.promptJson as {
      primaryChange?: string;
      styleName?: string;
      prompt?: string;
    } | null;

    try {
      const result = await step.run("flux-pipeline", () =>
        runRenderPipeline({
          tenantId,
          photoR2Key: photo.r2Key,
          styleName: promptJson?.styleName ?? "Modern Shaker",
          primaryChange: promptJson?.primaryChange ?? "redesign in a modern style",
        }),
      );

      await step.run("mark-completed", async () => {
        await db
          .update(renders)
          .set({
            status: "completed",
            outputR2Key: result.outputR2Key,
            thumbR2Key: result.thumbR2Key,
            costCents: result.costCents,
            qualityScore: result.qualityScore,
            durationMs: result.durationMs,
            modelName: result.modelName,
            modelProvider: result.modelProvider,
            completedAt: new Date(),
          })
          .where(eq(renders.id, renderId));
      });

      await step.sendEvent("emit-completed", {
        name: "render/completed",
        data: {
          tenantId,
          renderId,
          outputR2Key: result.outputR2Key,
          durationMs: result.durationMs,
        },
      });

      return { ok: true, renderId };
    } catch (err) {
      await db
        .update(renders)
        .set({
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        })
        .where(eq(renders.id, renderId));
      throw err;
    }
  },
);
