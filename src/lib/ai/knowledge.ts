/**
 * RAG knowledge base over a contractor's content.
 *
 * Stores embedded chunks in `vector_chunks` and retrieves the most relevant
 * ones at chat time via pgvector cosine similarity. Each tenant's knowledge is
 * isolated by `tenant_id`.
 */
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { vectorChunks } from "@/db/schema";
import { embedOne, embedTexts } from "./embeddings";

/** Split long text into ~chunkSize-character windows on sentence/paragraph breaks. */
function chunkText(text: string, chunkSize = 900): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= chunkSize) return clean ? [clean] : [];

  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + " " + sentence).length > chunkSize && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export interface IngestInput {
  tenantId: string;
  source: string; // e.g. "faq", "services", "pricing", "project"
  sourceId?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chunk, embed, and store text for a tenant. Replaces any existing chunks with
 * the same (source, sourceId) so re-ingesting updates cleanly.
 * Returns the number of chunks stored (0 if embeddings unavailable).
 */
export async function ingestKnowledge(input: IngestInput): Promise<number> {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) return 0;

  const embeddings = await embedTexts(chunks, "document");
  if (!embeddings) {
    console.log("[knowledge] Voyage not configured — skipping ingest");
    return 0;
  }

  // Clear prior chunks for this exact source so updates don't duplicate
  if (input.sourceId) {
    await db
      .delete(vectorChunks)
      .where(
        and(
          eq(vectorChunks.tenantId, input.tenantId),
          eq(vectorChunks.source, input.source),
          eq(vectorChunks.sourceId, input.sourceId),
        ),
      );
  }

  await db.insert(vectorChunks).values(
    chunks.map((content, i) => ({
      tenantId: input.tenantId,
      source: input.source,
      sourceId: input.sourceId,
      content,
      embedding: embeddings[i],
      metadata: input.metadata,
    })),
  );

  return chunks.length;
}

export interface RetrievedChunk {
  content: string;
  source: string;
  similarity: number;
}

/**
 * Retrieve the top-k most relevant knowledge chunks for a query.
 * Returns [] if Voyage isn't configured or nothing clears the threshold.
 */
export async function retrieveKnowledge(
  tenantId: string,
  query: string,
  k = 4,
  minSimilarity = 0.4,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedOne(query, "query");
  if (!queryEmbedding) return [];

  const similarity = sql<number>`1 - (${cosineDistance(vectorChunks.embedding, queryEmbedding)})`;

  const rows = await db
    .select({
      content: vectorChunks.content,
      source: vectorChunks.source,
      similarity,
    })
    .from(vectorChunks)
    .where(and(eq(vectorChunks.tenantId, tenantId), gt(similarity, minSimilarity)))
    .orderBy(desc(similarity))
    .limit(k);

  return rows;
}

/** Build a compact knowledge block to inject into the consultant system prompt. */
export function formatKnowledgeForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  const body = chunks.map((c, i) => `[${i + 1}] (${c.source}) ${c.content}`).join("\n");
  return `\n\nRelevant business knowledge (use this to answer accurately; do not invent facts beyond it):\n${body}`;
}
