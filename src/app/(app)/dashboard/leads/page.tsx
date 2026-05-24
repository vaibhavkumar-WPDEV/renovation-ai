import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/tenant";

export const dynamic = "force-dynamic";

const TEMP_COLOR: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-400",
  cold: "bg-sky-400",
};

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default async function LeadsPage() {
  let rows: (typeof leads.$inferSelect)[] = [];

  try {
    const { tenant } = await requireTenant();
    rows = await db
      .select()
      .from(leads)
      .where(eq(leads.tenantId, tenant.id))
      .orderBy(desc(leads.createdAt))
      .limit(100);
  } catch {
    // not authenticated or no DB connection yet
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} lead{rows.length !== 1 ? "s" : ""} captured so far,
          sorted by most recent.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No leads yet. Embed the widget on your site to start capturing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Stage</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{lead.fullName ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.email ?? lead.phone ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          TEMP_COLOR[lead.temperature ?? "cold"]
                        }`}
                      />
                      <span className="font-mono text-xs">{lead.score ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {lead.stage.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {lead.source ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {timeAgo(new Date(lead.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
