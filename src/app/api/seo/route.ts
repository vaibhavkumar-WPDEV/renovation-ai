import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seoPages } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";

export async function GET() {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pages = await db
    .select({
      id: seoPages.id,
      service: seoPages.service,
      city: seoPages.city,
      slug: seoPages.slug,
      views: seoPages.views,
      leadsCaptured: seoPages.leadsCaptured,
      publishedAt: seoPages.publishedAt,
    })
    .from(seoPages)
    .where(eq(seoPages.tenantId, tenant.id))
    .orderBy(desc(seoPages.createdAt))
    .limit(500);

  return NextResponse.json({ pages, tenantSlug: tenant.slug });
}

export async function DELETE(req: Request) {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  await db
    .delete(seoPages)
    .where(and(eq(seoPages.tenantId, tenant.id), eq(seoPages.slug, slug)));

  return NextResponse.json({ ok: true });
}
