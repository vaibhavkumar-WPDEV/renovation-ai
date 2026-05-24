import { env } from "@/lib/env";

export interface FluxRequest {
  photoR2Key: string;
  maskR2Key?: string;
  prompt: string;
  negativePrompt?: string;
  loraId?: string;
  seed?: number;
  steps?: number;
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
    return await generateWithReplicate(req);
  }
  throw new Error(
    "No FLUX provider configured — set FAL_API_KEY or REPLICATE_API_TOKEN",
  );
}

async function getPhotoPublicUrl(r2Key: string): Promise<string> {
  if (r2Key.startsWith("http")) return r2Key;
  if (env.R2_PUBLIC_URL) return `${env.R2_PUBLIC_URL}/${r2Key}`;
  const { presignDownload } = await import("@/lib/storage/r2");
  return presignDownload(env.R2_BUCKET_PHOTOS, r2Key, 3600);
}

async function generateWithFal(req: FluxRequest): Promise<FluxResult> {
  const { fal } = await import("@fal-ai/client");

  fal.config({ credentials: env.FAL_API_KEY! });

  const imageUrl = await getPhotoPublicUrl(req.photoR2Key);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await (fal.subscribe as any)(FAL_MODEL, {
    input: {
      image_url: imageUrl,
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      strength: 0.82,
      num_inference_steps: req.steps ?? 28,
      seed: req.seed ?? Math.floor(Math.random() * 999_999),
      enable_safety_checker: false,
    },
    logs: false,
  })) as { data: { images: Array<{ url: string }> } };

  const outputUrl = result.data.images[0]?.url;
  if (!outputUrl) throw new Error("Fal.ai returned no image");

  // Store the CDN URL directly for MVP. Week 3: download + re-upload to R2.
  return {
    outputR2Key: outputUrl,
    thumbR2Key: outputUrl,
    costCents: 8,
    qualityScore: 85,
    modelName: FAL_MODEL,
    provider: "fal",
  };
}

async function generateWithReplicate(req: FluxRequest): Promise<FluxResult> {
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN! });

  const imageUrl = await getPhotoPublicUrl(req.photoR2Key);

  const output = (await replicate.run(
    REPLICATE_MODEL as `${string}/${string}`,
    {
      input: {
        prompt: req.prompt,
        image: imageUrl,
        strength: 0.82,
        num_inference_steps: req.steps ?? 28,
        seed: req.seed,
      },
    },
  )) as string[];

  const outputUrl = output[0];
  if (!outputUrl) throw new Error("Replicate returned no image");

  return {
    outputR2Key: outputUrl,
    thumbR2Key: outputUrl,
    costCents: 10,
    qualityScore: 82,
    modelName: REPLICATE_MODEL,
    provider: "replicate",
  };
}
