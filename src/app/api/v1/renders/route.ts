import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { photoUploads, renders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { checkLimit, incrementUsage } from "@/lib/usage/meter";
import { rateLimit, ipFromRequest } from "@/lib/security/rateLimit";
import { tenantFromApiKey } from "@/lib/security/apiKeys";

const createRenderSchema = z.object({
  tenantSlug: z.string().optional(),
  photoId: z.string().uuid(),
  styleId: z.string().uuid().optional(),
  primaryChange: z.string(),
  leadId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  // 10 render requests per minute per IP — each render costs real money
  const rl = rateLimit(`v1-renders:${ipFromRequest(req)}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Partner API requires a tenant-scoped key — every render costs real money,
  // so we never trust a client-supplied tenant slug for billing/usage.
  const tenant = await tenantFromApiKey(req);
  if (!tenant) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing or invalid API key. Pass `Authorization: Bearer rk_live_...`." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createRenderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [photo] = await db
    .select()
    .from(photoUploads)
    .where(eq(photoUploads.id, parsed.data.photoId))
    .limit(1);
  if (!photo || photo.tenantId !== tenant.id) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Enforce monthly render limit for the tenant's plan
  const limit = await checkLimit(tenant.id, "renders");
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "render_limit_reached",
        message: `Monthly render limit reached (${limit.used}/${limit.limit} on ${limit.plan}). Upgrade your plan for more.`,
        used: limit.used,
        limit: limit.limit,
        plan: limit.plan,
      },
      { status: 429 },
    );
  }

  const [render] = await db
    .insert(renders)
    .values({
      tenantId: tenant.id,
      photoId: photo.id,
      leadId: parsed.data.leadId,
      styleId: parsed.data.styleId,
      promptJson: { primaryChange: parsed.data.primaryChange },
      status: "queued",
    })
    .returning();

  await incrementUsage(tenant.id, "rendersUsed");

  await inngest.send({
    name: "render/requested",
    data: {
      tenantId: tenant.id,
      renderId: render.id,
      photoId: photo.id,
      styleId: parsed.data.styleId,
      promptJson: { primaryChange: parsed.data.primaryChange },
      leadId: parsed.data.leadId,
    },
  });

  return NextResponse.json(
    { id: render.id, status: "queued", remaining: limit.remaining - 1 },
    { status: 202 },
  );
}

export async function GET(req: Request) {
  const tenant = await tenantFromApiKey(req);
  if (!tenant) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing or invalid API key. Pass `Authorization: Bearer rk_live_...`." },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const [render] = await db
    .select()
    .from(renders)
    .where(and(eq(renders.id, id), eq(renders.tenantId, tenant.id)));
  if (!render) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(render);
}
