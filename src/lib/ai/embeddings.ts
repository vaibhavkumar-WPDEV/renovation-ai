/**
 * Text embeddings via Voyage AI (voyage-3, 1024 dimensions).
 * Matches the `vector_chunks.embedding` column dimension.
 *
 * Gracefully degrades: if VOYAGE_API_KEY is unset, callers receive null and
 * should treat retrieval as empty / ingestion as a no-op.
 */
import { env } from "@/lib/env";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3";
export const EMBEDDING_DIMENSIONS = 1024;

type InputType = "document" | "query";

/** Embed a batch of texts. Returns null if Voyage is not configured. */
export async function embedTexts(
  texts: string[],
  inputType: InputType,
): Promise<number[][] | null> {
  if (!env.VOYAGE_API_KEY || texts.length === 0) return null;

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Voyage embed failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}

/** Embed a single text. Returns null if Voyage is not configured. */
export async function embedOne(
  text: string,
  inputType: InputType,
): Promise<number[] | null> {
  const result = await embedTexts([text], inputType);
  return result?.[0] ?? null;
}
