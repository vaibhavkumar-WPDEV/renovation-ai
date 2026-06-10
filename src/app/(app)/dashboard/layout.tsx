import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { requireTenant } from "@/lib/auth/tenant";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getUsage } from "@/lib/usage/meter";
import { limitsForPlan, type PlanName } from "@/lib/constants/plans";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/renders", label: "Renders" },
  { href: "/dashboard/brandkit", label: "BrandKit" },
  { href: "/dashboard/knowledge", label: "AI Knowledge" },
  { href: "/dashboard/seo", label: "SEO Pages" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/integrations", label: "Integrations" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let tenant: Awaited<ReturnType<typeof requireTenant>>["tenant"] | null = null;

  try {
    const result = await requireTenant();
    tenant = result.tenant;
  } catch (err) {
    if (err instanceof Error && err.message.includes("not provisioned")) {
      redirect("/onboarding");
    }
  }

  const { userId } = await auth();
  const adminIds = env.ADMIN_CLERK_USER_IDS?.split(",").map((s) => s.trim()) ?? [];
  const isAdmin = !!userId && adminIds.length > 0 && adminIds.includes(userId);

  const isTrialing = tenant?.status === "trialing";
  const trialEndsAt = tenant?.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - nowMs) / 86_400_000))
    : 0;

  // Render-usage warning (≥80% of monthly limit)
  let renderUsagePct = 0;
  let renderLimitReached = false;
  if (tenant) {
    const usage = await getUsage(tenant.id);
    const limit = limitsForPlan(tenant.plan as PlanName).rendersPerMonth;
    if (Number.isFinite(limit) && limit > 0) {
      renderUsagePct = Math.round((usage.rendersUsed / limit) * 100);
      renderLimitReached = usage.rendersUsed >= limit;
    }
  }
  const showUsageWarning = renderUsagePct >= 80;

  return (
    <div className="flex flex-1 flex-col">
      {/* Trial expiry banner — shows in last 7 days */}
      {isTrialing && trialDaysLeft <= 7 && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
          {trialDaysLeft === 0
            ? "Your free trial has ended. "
            : `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}. `}
          <Link href="/pricing" className="font-semibold underline underline-offset-2 hover:no-underline">
            Upgrade now →
          </Link>
        </div>
      )}

      {/* Render usage warning — at 80%+ of monthly limit */}
      {showUsageWarning && (
        <div className="border-b border-orange-200 bg-orange-50 px-6 py-2 text-center text-xs text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400">
          {renderLimitReached
            ? "You've reached your monthly render limit. "
            : `You've used ${renderUsagePct}% of your monthly renders. `}
          <Link href="/pricing" className="font-semibold underline underline-offset-2 hover:no-underline">
            Upgrade for more →
          </Link>
        </div>
      )}

      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            RenovateAI
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-6 py-8">
        <aside className="w-52 shrink-0">
          <nav className="flex flex-col gap-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <>
                <hr className="my-2 border-border" />
                <Link
                  href="/dashboard/admin"
                  className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  ⚙ Admin
                </Link>
              </>
            )}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
