import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { audit } from "@/lib/security/audit";

/** Disconnect the tenant's GoHighLevel integration. */
export async function DELETE(req: Request) {
  let tenant, user;
  try {
    ({ tenant, user } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.tenantId, tenant.id),
        eq(integrations.provider, "gohighlevel"),
      ),
    );

  await audit({
    tenantId: tenant.id,
    actorId: user.id,
    action: "integration.disconnected",
    entity: "integration",
    entityId: "gohighlevel",
    req,
  });

  return NextResponse.json({ ok: true });
}
