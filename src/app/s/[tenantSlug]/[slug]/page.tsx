import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { seoPages, tenants } from "@/db/schema";

// ISR: serve cached HTML, revalidate hourly — fast loads + fresh content
export const revalidate = 3600;

type Params = { tenantSlug: string; slug: string };

const loadPage = cache(async (tenantSlug: string, slug: string) => {
  const [row] = await db
    .select({
      id: seoPages.id,
      html: seoPages.html,
      schemaJson: seoPages.schemaJson,
      service: seoPages.service,
      city: seoPages.city,
      tenantName: tenants.name,
    })
    .from(seoPages)
    .innerJoin(tenants, eq(seoPages.tenantId, tenants.id))
    .where(and(eq(tenants.slug, tenantSlug), eq(seoPages.slug, slug)))
    .limit(1);
  return row ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tenantSlug, slug } = await params;
  const page = await loadPage(tenantSlug, slug);
  if (!page) return { title: "Not found" };

  const meta = (page.schemaJson as { meta?: { title?: string; description?: string } })?.meta;
  return {
    title: meta?.title ?? `${page.service} in ${page.city}`,
    description: meta?.description,
    alternates: { canonical: `/s/${tenantSlug}/${slug}` },
    openGraph: {
      title: meta?.title ?? `${page.service} in ${page.city}`,
      description: meta?.description,
      type: "website",
    },
  };
}

export default async function SeoPage({ params }: { params: Promise<Params> }) {
  const { tenantSlug, slug } = await params;
  const page = await loadPage(tenantSlug, slug);
  if (!page || !page.html) notFound();

  // Increment view count (non-blocking, best-effort)
  db.update(seoPages)
    .set({ views: sql`${seoPages.views} + 1` })
    .where(eq(seoPages.id, page.id))
    .catch(() => {});

  const jsonLd = (page.schemaJson as { jsonLd?: Record<string, unknown> })?.jsonLd;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="mb-8 text-sm font-semibold text-accent">{page.tenantName}</div>
      <div
        className="seo-content space-y-6"
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
    </main>
  );
}
