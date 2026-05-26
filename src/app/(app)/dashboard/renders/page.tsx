import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db/client";
import { renders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/tenant";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function renderOutputUrl(r2Key: string | null): string | null {
  if (!r2Key) return null;
  if (r2Key.startsWith("http")) return r2Key;
  if (env.R2_PUBLIC_URL) return `${env.R2_PUBLIC_URL}/${r2Key}`;
  return null;
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default async function RendersPage() {
  let rows: (typeof renders.$inferSelect)[] = [];

  try {
    const { tenant } = await requireTenant();
    rows = await db
      .select()
      .from(renders)
      .where(eq(renders.tenantId, tenant.id))
      .orderBy(desc(renders.createdAt))
      .limit(50);
  } catch {
    // not authenticated or no DB
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      queued: "bg-slate-100 text-slate-600",
      processing: "bg-amber-100 text-amber-700",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };
    return map[status] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Renders</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} render{rows.length !== 1 ? "s" : ""} generated so far.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No renders yet. Homeowners generate renders via your embedded widget.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const url = renderOutputUrl(r.outputR2Key);
            return (
              <div key={r.id} className="overflow-hidden rounded-2xl border border-border">
                <div className="relative bg-muted" style={{ aspectRatio: "4/3" }}>
                  {url ? (
                    <img
                      src={url}
                      alt="AI render"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {r.status === "processing" ? "Generating…" : r.status}
                    </div>
                  )}
                  <span
                    className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(r.status)}`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">
                    {r.modelProvider ?? "—"} · ${((r.costCents ?? 0) / 100).toFixed(2)} ·{" "}
                    {timeAgo(new Date(r.createdAt))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
