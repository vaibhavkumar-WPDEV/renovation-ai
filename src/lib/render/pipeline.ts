/**
 * Render pipeline orchestrator.
 *
 * Pipeline:
 *  1. Preprocess (resize, EXIF strip, blur check)
 *  2. Segment (SAM 2) — optional, only if user provided a mask region
 *  3. Build prompt from style + scope
 *  4. Call FLUX.2-dev (Fal.ai primary, Replicate fallback)
 *  5. Upscale + watermark
 *  6. Store in R2, emit render.completed event
 *
 * This file is the high-level coordinator. Provider-specific code lives in
 * ./flux.ts and ./segmentation.ts.
 */
import { generateWithFlux } from "./flux";
import { type SegmentationResult, runSegmentation } from "./segmentation";
import { buildRenderPrompt, NEGATIVE_PROMPT } from "@/lib/ai/prompts";

export interface RenderRequest {
  tenantId: string;
  photoR2Key: string;
  styleName: string;
  primaryChange: string;
  materials?: Record<string, string>;
  preserveElements?: string[];
  maskRegion?: { x: number; y: number; w: number; h: number };
  loraId?: string;
  seed?: number;
}

export interface RenderResult {
  outputR2Key: string;
  thumbR2Key: string;
  costCents: number;
  durationMs: number;
  qualityScore: number;
  modelName: string;
  modelProvider: string;
  segmentation?: SegmentationResult;
}

export async function runRenderPipeline(
  req: RenderRequest,
): Promise<RenderResult> {
  const start = Date.now();

  const segmentation = req.maskRegion
    ? await runSegmentation({
        photoR2Key: req.photoR2Key,
        bbox: [
          req.maskRegion.x,
          req.maskRegion.y,
          req.maskRegion.w,
          req.maskRegion.h,
        ],
      })
    : undefined;

  const prompt = buildRenderPrompt({
    vertical: "kitchen", // TODO: pass vertical from caller
    styleName: req.styleName,
    primaryChange: req.primaryChange,
    materials: req.materials,
    preserveElements: req.preserveElements,
  });

  const flux = await generateWithFlux({
    photoR2Key: req.photoR2Key,
    maskR2Key: segmentation?.maskR2Key,
    prompt,
    negativePrompt: NEGATIVE_PROMPT,
    loraId: req.loraId,
    seed: req.seed,
  });

  return {
    outputR2Key: flux.outputR2Key,
    thumbR2Key: flux.thumbR2Key,
    costCents: flux.costCents + (segmentation?.costCents ?? 0),
    durationMs: Date.now() - start,
    qualityScore: flux.qualityScore,
    modelName: flux.modelName,
    modelProvider: flux.provider,
    segmentation,
  };
}
