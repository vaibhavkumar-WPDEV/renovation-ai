import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { brandkits, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export const dynamic = "force-dynamic";

export default async function EmbedPage({ params }: Props) {
  const { tenantSlug } = await params;

  const [row] = await db
    .select({ tenant: tenants, brandkit: brandkits })
    .from(tenants)
    .leftJoin(brandkits, eq(brandkits.tenantId, tenants.id))
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!row?.tenant) {
    notFound();
  }

  const primary = row.brandkit?.primaryColor ?? "#0F172A";
  const accent = row.brandkit?.accentColor ?? "#F59E0B";

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        // Brandkit theming via CSS vars (overrides globals.css for embed only)
        ["--primary" as string]: primary,
        ["--accent" as string]: accent,
      }}
    >
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {row.brandkit?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.brandkit.logoUrl}
                alt={row.tenant.name}
                className="h-7"
              />
            )}
            <span className="text-sm font-semibold">{row.tenant.name}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Design Studio
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Redesign your{" "}
            <span style={{ color: accent }}>
              {row.tenant.primaryVertical === "cabinetry" ? "kitchen" : "space"}
            </span>{" "}
            in 60 seconds.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Upload a photo. Pick a style. See it transformed by AI — designed in
            the signature style of {row.tenant.name}.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Widget body lands week 2 of the MVP:<br />
            photo upload · style picker · render viewer · email gate · booking
          </p>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-4 text-center text-xs text-muted-foreground">
          AI-generated visualizations. Final design will vary. Designed and
          delivered by {row.tenant.name}.
        </div>
      </footer>
    </div>
  );
}
