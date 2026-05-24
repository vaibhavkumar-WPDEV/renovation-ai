import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { brandkits, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WidgetFlow } from "@/components/widget/WidgetFlow";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export const dynamic = "force-dynamic";

const VERTICAL_LABEL: Record<string, string> = {
  cabinetry: "kitchen",
  bathroom: "bathroom",
  kitchen: "kitchen",
  landscaping: "outdoor space",
  pool: "pool area",
  outdoor_structures: "outdoor space",
  full_renovation: "home",
};

export default async function EmbedPage({ params }: Props) {
  const { tenantSlug } = await params;

  const [row] = await db
    .select({ tenant: tenants, brandkit: brandkits })
    .from(tenants)
    .leftJoin(brandkits, eq(brandkits.tenantId, tenants.id))
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!row?.tenant) notFound();

  const primary = row.brandkit?.primaryColor ?? "#0F172A";
  const accent = row.brandkit?.accentColor ?? "#F59E0B";
  const spaceLabel = VERTICAL_LABEL[row.tenant.primaryVertical] ?? "space";

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ ["--primary" as string]: primary, ["--accent" as string]: accent }}
    >
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {row.brandkit?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.brandkit.logoUrl} alt={row.tenant.name} className="h-7" />
            )}
            <span className="text-sm font-semibold">{row.tenant.name}</span>
          </div>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            AI Design Studio
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Redesign your{" "}
            <span style={{ color: accent }}>{spaceLabel}</span>
            {" "}in 60 seconds.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a photo · pick a style · see it transformed by AI.
            <br />
            Free. No signup required.
          </p>
        </div>

        <WidgetFlow
          tenantSlug={tenantSlug}
          tenantName={row.tenant.name}
          accentColor={accent}
        />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-xl px-4 py-4 text-center text-xs text-muted-foreground">
          AI-generated visualizations. Final designs may vary. Delivered by{" "}
          {row.tenant.name}.
        </div>
      </footer>
    </div>
  );
}
