import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/client";
import { leads, renders, proposals } from "@/db/schema";
import { eq, gte, count, and } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/tenant";

export const dynamic = "force-dynamic";

function pct(a: number, b: number) {
  if (b === 0) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

export default async function DashboardHome() {
  let stats = {
    leadsThisWeek: 0,
    rendersTotal: 0,
    proposalsSigned: 0,
    conversionRate: "—",
    totalLeads: 0,
    tenantSlug: "",
    tenantName: "",
  };

  try {
    const { tenant } = await requireTenant();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [[weekLeads], [allLeads], [allRenders], [signedProps]] =
      await Promise.all([
        db
          .select({ n: count() })
          .from(leads)
          .where(and(eq(leads.tenantId, tenant.id), gte(leads.createdAt, since))),
        db
          .select({ n: count() })
          .from(leads)
          .where(eq(leads.tenantId, tenant.id)),
        db
          .select({ n: count() })
          .from(renders)
          .where(eq(renders.tenantId, tenant.id)),
        db
          .select({ n: count() })
          .from(proposals)
          .where(
            and(
              eq(proposals.tenantId, tenant.id),
              eq(proposals.status, "signed"),
            ),
          ),
      ]);

    stats = {
      leadsThisWeek: weekLeads?.n ?? 0,
      rendersTotal: allRenders?.n ?? 0,
      proposalsSigned: signedProps?.n ?? 0,
      conversionRate: pct(signedProps?.n ?? 0, allLeads?.n ?? 0),
      totalLeads: allLeads?.n ?? 0,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
    };
  } catch {
    // not authenticated or no DB
  }

  const statCards = [
    {
      label: "New leads (7d)",
      value: stats.leadsThisWeek > 0 ? String(stats.leadsThisWeek) : "—",
      hint: stats.totalLeads === 0 ? "Embed the widget to start capturing" : `${stats.totalLeads} total`,
    },
    {
      label: "Renders generated",
      value: stats.rendersTotal > 0 ? String(stats.rendersTotal) : "—",
    },
    {
      label: "Proposals signed",
      value: stats.proposalsSigned > 0 ? String(stats.proposalsSigned) : "—",
    },
    {
      label: "Lead → Won rate",
      value: stats.conversionRate,
    },
  ];

  const setupSteps = [
    {
      label: "Complete your BrandKit",
      done: false,
      href: "/dashboard/brandkit",
      hint: "Upload logo, colors, and business bio",
    },
    {
      label: "Connect your CRM",
      done: false,
      href: "/dashboard/integrations",
      hint: "GoHighLevel, HubSpot, or Jobber — 2 clicks",
    },
    {
      label: "Embed the widget on your site",
      done: stats.totalLeads > 0,
      href: "/dashboard/settings",
      hint: "One <script> tag — takes 5 minutes",
    },
    {
      label: "Run a test lead end-to-end",
      done: stats.totalLeads > 0,
      href: stats.tenantSlug ? `/embed/${stats.tenantSlug}` : "#",
      hint: "Upload a photo, pick a style, enter a test email",
    },
  ];

  const completedSteps = setupSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {stats.tenantName ? `Welcome back, ${stats.tenantName}` : "Overview"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {stats.totalLeads === 0
            ? "Finish the setup below to start capturing leads."
            : `You have ${stats.totalLeads} lead${stats.totalLeads !== 1 ? "s" : ""} in your pipeline.`}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1">
              <CardDescription className="text-xs">{s.label}</CardDescription>
              <CardTitle className="text-2xl">{s.value}</CardTitle>
            </CardHeader>
            {s.hint && (
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Setup checklist */}
      {completedSteps < setupSteps.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Quick start
              <span className="text-sm font-normal text-muted-foreground">
                {completedSteps}/{setupSteps.length} done
              </span>
            </CardTitle>
            <CardDescription>
              ~30 minutes to your first AI-rendered lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {setupSteps.map((step, i) => (
              <a
                key={step.label}
                href={step.href}
                className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/40 transition-colors"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    step.done
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <div>
                  <p className={step.done ? "line-through text-muted-foreground" : "font-medium"}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.hint}</p>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Widget preview link */}
      {stats.tenantSlug && (
        <Card>
          <CardHeader>
            <CardTitle>Your homeowner widget</CardTitle>
            <CardDescription>
              Share this link or embed it as an iframe on your site.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs">
              {typeof window === "undefined"
                ? `/embed/${stats.tenantSlug}`
                : `${window.location.origin}/embed/${stats.tenantSlug}`}
            </code>
            <a
              href={`/embed/${stats.tenantSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              Preview →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
