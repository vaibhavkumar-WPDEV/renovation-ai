import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brandkits, seoPages } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { getTenantPlan } from "@/lib/usage/meter";
import { limitsForPlan } from "@/lib/constants/plans";
import { generateSeoContent, buildSeoPage, slugifySeo } from "@/lib/ai/seo";
import { env } from "@/lib/env";

export const maxDuration = 120;

const schema = z.object({
  service: z.string().min(2).max(128),
  cities: z.array(z.string().min(2).max(128)).min(1).max(10),
});

export async function POST(req: Request) {
  let tenant;
  try {
    const result = await requireTenant();
    tenant = result.tenant;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  // Feature gate: SEO generator is Pro tier and above
  const plan = await getTenantPlan(tenant.id);
  if (!limitsForPlan(plan).seoGenerator) {
    return NextResponse.json(
      { error: "upgrade_required", message: "The SEO generator is available on Pro and above." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [brandkit] = await db
    .select()
    .from(brandkits)
    .where(eq(brandkits.tenantId, tenant.id))
    .limit(1);

  const { service, cities } = parsed.data;
  const widgetUrl = `${env.NEXT_PUBLIC_APP_URL}/embed/${tenant.slug}`;
  const created: Array<{ slug: string; city: string }> = [];

  for (const city of cities) {
    const slug = slugifySeo(service, city);

    // Skip if a page with this slug already exists
    const [existing] = await db
      .select({ id: seoPages.id })
      .from(seoPages)
      .where(and(eq(seoPages.tenantId, tenant.id), eq(seoPages.slug, slug)))
      .limit(1);
    if (existing) continue;

    try {
      const content = await generateSeoContent({ tenant, brandkit: brandkit ?? null, service, city });
      const page = buildSeoPage({ content, tenant, service, city, widgetUrl });

      await db.insert(seoPages).values({
        tenantId: tenant.id,
        service,
        city,
        slug,
        html: page.html,
        schemaJson: page.schemaJson,
        publishedAt: new Date(),
      });
      created.push({ slug, city });
    } catch (err) {
      console.error(`[seo] generation failed for ${city}`, err);
    }
  }

  return NextResponse.json({ ok: true, created, count: created.length });
}
