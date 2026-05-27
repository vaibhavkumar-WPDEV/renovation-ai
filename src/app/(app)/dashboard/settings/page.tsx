import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth/tenant";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { StripePortalButton } from "./StripePortalButton";
import { getUsage } from "@/lib/usage/meter";
import { limitsForPlan, type PlanName } from "@/lib/constants/plans";

export const dynamic = "force-dynamic";

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const near = pct >= 80;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={near ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
          {used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${near ? "bg-amber-500" : "bg-accent"}`}
          style={{ width: `${unlimited ? 4 : pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  let slug = "";
  let plan = "starter";
  let hasStripeCustomer = false;
  let usage = { rendersUsed: 0, leadsReceived: 0, messagesSent: 0 };

  try {
    const { tenant } = await requireTenant();
    slug = tenant.slug;
    plan = tenant.plan;
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenant.id))
      .limit(1);
    hasStripeCustomer = !!sub?.stripeCustomerId;
    if (sub?.plan) plan = sub.plan;
    usage = await getUsage(tenant.id);
  } catch {
    // not authenticated
  }

  const limits = limitsForPlan(plan as PlanName);

  const origin = "https://your-domain.com"; // replaced at runtime by client
  const iframeSnippet = slug
    ? `<iframe\n  src="${origin}/embed/${slug}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  allow="camera"\n  style="border-radius:16px"\n></iframe>`
    : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace, embed, and billing.</p>
      </div>

      {/* Embed */}
      <Card>
        <CardHeader>
          <CardTitle>Embed your widget</CardTitle>
          <CardDescription>
            Paste this snippet anywhere on your website — contact page, homepage, or a dedicated
            design page. Works with any site builder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {slug ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Iframe embed</p>
                <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs leading-relaxed">
                  {iframeSnippet}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Direct link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs">
                    /embed/{slug}
                  </code>
                  <a
                    href={`/embed/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    Preview →
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                Replace <code className="font-mono text-xs">your-domain.com</code> with your
                actual domain. For custom subdomain setup (e.g.{" "}
                <code className="font-mono text-xs">design.yoursite.com</code>), contact support.
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in to see your embed snippet.</p>
          )}
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan and usage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current plan</span>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-accent">
              {plan}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Billing</span>
            <span>Monthly</span>
          </div>

          {/* This month's usage */}
          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">This month&apos;s usage</p>
            <UsageBar label="AI renders" used={usage.rendersUsed} limit={limits.rendersPerMonth} />
            <UsageBar label="Leads captured" used={usage.leadsReceived} limit={limits.leadsPerMonth} />
          </div>

          <div className="pt-2">
            {hasStripeCustomer ? (
              <StripePortalButton />
            ) : (
              <a
                href="/pricing"
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
              >
                Upgrade plan →
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger zone</CardTitle>
          <CardDescription>Irreversible actions. Proceed carefully.</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            disabled
            className="rounded-lg border border-red-300 px-4 py-2 text-xs font-medium text-red-600 opacity-50 dark:border-red-800 dark:text-red-400"
          >
            Delete workspace
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Contact support to delete your workspace and all associated data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
