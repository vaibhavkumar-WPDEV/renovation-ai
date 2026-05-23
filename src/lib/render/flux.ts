/**
 * FLUX.2-dev image generation via Fal.ai (primary) and Replicate (fallback).
 *
 * Per the plan, FLUX.2-dev was chosen for its photoreal architectural quality
 * and out-of-the-box performance on interior/exterior scenes vs. SDXL.
 *
 * NOTE: This module is the integration surface. Actual HTTP calls to Fal/Replicate
 * are stubbed during Week 1 scaffold — implement in Week 2 of the MVP roadmap.
 */
import { env } from "@/lib/env";

export interface FluxRequest {
  photoR2Key: string;
  maskR2Key?: string;
  prompt: string;
  negativePrompt?: string;
  loraId?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
}

export interface FluxResult {
  outputR2Key: string;
  thumbR2Key: string;
  costCents: number;
  qualityScore: number;
  modelName: string;
  provider: "fal" | "replicate";
}

const FAL_MODEL = "fal-ai/flux/dev/image-to-image";
const REPLICATE_MODEL = "black-forest-labs/flux-dev";

export async function generateWithFlux(req: FluxRequest): Promise<FluxResult> {
  if (env.FAL_API_KEY) {
    try {
      return await generateWithFal(req);
    } catch (err) {
      console.error("[flux] Fal.ai failed, falling back to Replicate:", err);
    }
  }
  if (env.REPLICATE_API_TOKEN) {
    return generateWithReplicate(req);
  }
  throw new Error("No FLUX provider configured (set FAL_API_KEY or REPLICATE_API_TOKEN)");
}

async function generateWithFal(req: FluxRequest): Promise<FluxResult> {
  // TODO Week 2: real Fal.ai call via @fal-ai/serverless-client
  //   const result = await fal.subscribe(FAL_MODEL, { input: { ... } })
  console.log("[flux/fal] would call", FAL_MODEL, "with prompt:", req.prompt);
  throw new Error("Fal.ai integration not yet implemented (Week 2 MVP)");
}

async function generateWithReplicate(req: FluxRequest): Promise<FluxResult> {
  // TODO Week 2: real Replicate call
  console.log("[flux/replicate] would call", REPLICATE_MODEL, "with prompt:", req.prompt);
  throw new Error("Replicate integration not yet implemented (Week 2 MVP)");
}
