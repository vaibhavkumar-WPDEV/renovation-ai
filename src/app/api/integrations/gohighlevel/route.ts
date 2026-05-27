import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";

/** Disconnect the tenant's GoHighLevel integration. */
export async function DELETE() {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
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

  return NextResponse.json({ ok: true });
}
