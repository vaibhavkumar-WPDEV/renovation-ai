import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { vectorChunks } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { ingestKnowledge } from "@/lib/ai/knowledge";
import { env } from "@/lib/env";

const addSchema = z.object({
  source: z.enum(["faq", "services", "pricing", "project", "general"]),
  title: z.string().max(200).optional(),
  text: z.string().min(10).max(20000),
});

export async function POST(req: Request) {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.VOYAGE_API_KEY) {
    return NextResponse.json(
      { error: "Knowledge base requires VOYAGE_API_KEY to be configured." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const sourceId = parsed.data.title
    ? parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64)
    : `entry-${Date.now()}`;

  const count = await ingestKnowledge({
    tenantId: tenant.id,
    source: parsed.data.source,
    sourceId,
    text: parsed.data.text,
    metadata: { title: parsed.data.title },
  });

  return NextResponse.json({ ok: true, chunks: count, sourceId });
}

export async function GET() {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: vectorChunks.id,
      source: vectorChunks.source,
      sourceId: vectorChunks.sourceId,
      content: vectorChunks.content,
      metadata: vectorChunks.metadata,
      createdAt: vectorChunks.createdAt,
    })
    .from(vectorChunks)
    .where(eq(vectorChunks.tenantId, tenant.id))
    .orderBy(desc(vectorChunks.createdAt))
    .limit(200);

  return NextResponse.json({ entries: rows });
}

export async function DELETE(req: Request) {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sourceId = url.searchParams.get("sourceId");
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  await db
    .delete(vectorChunks)
    .where(
      and(
        eq(vectorChunks.tenantId, tenant.id),
        eq(vectorChunks.sourceId, sourceId),
      ),
    );

  return NextResponse.json({ ok: true });
}
