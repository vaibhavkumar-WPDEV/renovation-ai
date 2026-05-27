import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/client";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/tenant";
import { env } from "@/lib/env";
import { DisconnectButton } from "./DisconnectButton";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  let connected: Record<string, { status: string; lastSyncAt: Date | null }> = {};

  try {
    const { tenant } = await requireTenant();
    const rows = await db
      .select()
      .from(integrations)
      .where(eq(integrations.tenantId, tenant.id));
    connected = Object.fromEntries(
      rows.map((r) => [r.provider, { status: r.status, lastSyncAt: r.lastSyncAt }]),
    );
  } catch {
    // not authenticated
  }

  const ghl = connected["gohighlevel"];
  const ghlConfigured = !!env.GHL_OAUTH_CLIENT_ID;

  const comingSoon = [
    { name: "HubSpot", status: "Ready week 13" },
    { name: "Jobber", status: "Ready week 13" },
    { name: "Pipedrive", status: "Ready week 13" },
    { name: "Zapier", status: "Ready month 8" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Push leads, deals, and stage changes into your existing CRM. Leads auto-sync the moment
          they&apos;re scored.
        </p>
      </div>

      {/* GoHighLevel — live */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              GoHighLevel
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                Priority
              </span>
            </span>
            {ghl ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                Connected
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ghl ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {ghl.lastSyncAt
                  ? `Last synced ${new Date(ghl.lastSyncAt).toLocaleString()}`
                  : "Connected — waiting for first lead to sync."}
              </p>
              <DisconnectButton provider="gohighlevel" />
            </div>
          ) : ghlConfigured ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Connect your GHL account to auto-push qualified leads.
              </p>
              <a
                href="/api/integrations/gohighlevel/connect"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Connect GoHighLevel →
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              GoHighLevel OAuth isn&apos;t configured yet. Add{" "}
              <code className="font-mono text-xs">GHL_OAUTH_CLIENT_ID</code> and{" "}
              <code className="font-mono text-xs">GHL_OAUTH_CLIENT_SECRET</code> to enable.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Coming soon */}
      <div className="grid gap-4 sm:grid-cols-2">
        {comingSoon.map((p) => (
          <Card key={p.name}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.status}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
