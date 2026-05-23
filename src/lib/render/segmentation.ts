/**
 * SAM 2 (Segment Anything Model 2) segmentation via Replicate.
 * Used to produce per-region masks for inpainting workflows.
 */
import { env } from "@/lib/env";

export interface SegmentationRequest {
  photoR2Key: string;
  bbox?: [number, number, number, number]; // [x, y, w, h]
  point?: [number, number]; // user-tap coordinates
  category?: "cabinet" | "countertop" | "backsplash" | "floor" | "wall" | "appliance";
}

export interface SegmentationResult {
  maskR2Key: string;
  bbox: [number, number, number, number];
  score: number;
  costCents: number;
}

const SAM_MODEL = "meta/sam-2";

export async function runSegmentation(
  req: SegmentationRequest,
): Promise<SegmentationResult> {
  if (!env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN required for SAM 2");
  }
  // TODO Week 2: real Replicate call
  console.log("[segmentation] would call", SAM_MODEL, "for", req.photoR2Key);
  throw new Error("SAM 2 integration not yet implemented (Week 2 MVP)");
}
