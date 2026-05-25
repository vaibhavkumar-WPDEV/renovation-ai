import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { db } from "@/db/client";
import { photoUploads, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { presignUpload, photoKey } from "@/lib/storage/r2";
import { env } from "@/lib/env";
import { rateLimit, ipFromRequest } from "@/lib/security/rateLimit";

const schema = z.object({
  tenantSlug: z.string(),
  filename: z.string(),
  contentType: z.string().regex(/^image\//),
  size: z.number().max(20 * 1024 * 1024),
  leadId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  // 10 uploads per minute per IP
  const rl = rateLimit(`upload:${ipFromRequest(req)}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many uploads. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, parsed.data.tenantSlug))
    .limit(1);
  if (!tenant) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
  }

  const ext = parsed.data.filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const tempHash = createHash("sha256")
    .update(`${tenant.id}-${Date.now()}-${parsed.data.filename}`)
    .digest("hex")
    .slice(0, 24);

  const key = photoKey(tenant.id, tempHash, ext);

  const [photo] = await db
    .insert(photoUploads)
    .values({
      tenantId: tenant.id,
      leadId: parsed.data.leadId ?? null,
      r2Key: key,
      contentHash: tempHash,
      mimeType: parsed.data.contentType,
      exifStripped: false,
    })
    .returning();

  // Generate presigned upload URL if R2 is configured
  let uploadUrl: string | null = null;
  try {
    uploadUrl = await presignUpload(
      env.R2_BUCKET_PHOTOS,
      key,
      parsed.data.contentType,
      600,
    );
  } catch {
    // R2 not configured — client skips the PUT; photo row still created
  }

  return NextResponse.json({ photoId: photo.id, uploadUrl, r2Key: key });
}
