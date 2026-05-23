import { eq } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/db/client";
import { renders } from "@/db/schema";
import { runRenderPipeline } from "@/lib/render/pipeline";

/**
 * On `render/requested`, run the FLUX pipeline and update the render row.
 */
export const processRender = inngest.createFunction(
  {
    id: "process-render",
    name: "Process render job",
    concurrency: { limit: 50, key: "event.data.tenantId" },
    retries: 2,
  },
  { event: "render/requested" },
  async ({ event, step }) => {
    const { renderId, tenantId } = event.data;

    const row = await step.run("load-render", async () => {
      const [r] = await db.select().from(renders).where(eq(renders.id, renderId));
      if (!r) throw new Error(`Render ${renderId} not found`);
      return r;
    });

    await step.run("mark-processing", async () => {
      await db
        .update(renders)
        .set({ status: "processing" })
        .where(eq(renders.id, renderId));
    });

    try {
      const result = await step.run("flux-pipeline", () =>
        runRenderPipeline({
          tenantId,
          photoR2Key: row.outputR2Key ?? "", // TODO load photo r2 key from photoUploads
          styleName: "Modern shaker",
          primaryChange: "Replace existing cabinets with shaker style",
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
