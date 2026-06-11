import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { generateApiKey } from "@/lib/security/apiKeys";
import { audit } from "@/lib/security/audit";

const createSchema = z.object({
  name: z.string().min(1).max(128),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

/** List the tenant's active API keys (hashes never returned). */
export async function GET() {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.tenantId, tenant.id), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));

  return NextResponse.json({ keys: rows });
}

/** Create a new API key. The full key is returned once and never again. */
export async function POST(req: Request) {
  let tenant, user;
  try {
    ({ tenant, user } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { key, prefix, hash } = generateApiKey();
  const [row] = await db
    .insert(apiKeys)
    .values({ tenantId: tenant.id, name: parsed.data.name, keyPrefix: prefix, keyHash: hash })
    .returning({ id: apiKeys.id, name: apiKeys.name, createdAt: apiKeys.createdAt });

  await audit({
    tenantId: tenant.id,
    actorId: user.id,
    action: "api_key.created",
    entity: "api_key",
    entityId: row.id,
    after: { name: row.name, keyPrefix: prefix },
    req,
  });

  return NextResponse.json({ id: row.id, name: row.name, key, keyPrefix: prefix, createdAt: row.createdAt }, { status: 201 });
}

/** Revoke an API key. */
export async function DELETE(req: Request) {
  let tenant, user;
  try {
    ({ tenant, user } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, parsed.data.id), eq(apiKeys.tenantId, tenant.id)))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, existing.id));

  await audit({
    tenantId: tenant.id,
    actorId: user.id,
    action: "api_key.revoked",
    entity: "api_key",
    entityId: existing.id,
    before: { name: existing.name, keyPrefix: existing.keyPrefix },
    req,
  });

  return NextResponse.json({ ok: true });
}
