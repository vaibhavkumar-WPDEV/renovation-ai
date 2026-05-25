import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { tenants, leads, renders, subscriptions } from "@/db/schema";
import { count, desc, gte, sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function AdminPage() {
  const { userId } = await auth();
  const adminIds = env.ADMIN_CLERK_USER_IDS?.split(",").map((s) => s.trim()) ?? [];

  if (!userId || (adminIds.length > 0 && !adminIds.includes(userId))) {
    redirect("/dashboard");
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    allTenants,
    [{ total: totalLeads }],
    [{ total: totalRenders }],
    [{ active: activeSubscriptions }],
  ] = await Promise.all([
    db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        plan: tenants.plan,
        status: tenants.status,
        countryCode: tenants.countryCode,
        createdAt: tenants.createdAt,
        trialEndsAt: tenants.trialEndsAt,
      })
      .from(tenants)
      .orderBy(desc(tenants.createdAt))
      .limit(200),
    db.select({ total: count() }).from(leads),
    db.select({ total: count() }).from(renders),
    db
      .select({ active: count() })
      .from(subscriptions)
      .where(sql`${subscriptions.status} = 'active'`),
  ]);

  const tenantsSince30d = allTenants.filter((t) => t.createdAt >= since30d).length;

  const planCounts = allTenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {});

  const statusCounts = allTenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const planColors: Record<string, string> = {
    starter: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    growth: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    pro: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
    agency: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    enterprise: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  };

  const statusColors: Record<string, string> = {
    trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    canceled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    suspended: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
        <p className="text-sm text-muted-foreground">Platform overview — visible only to admins.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total accounts</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-bold">{allTenants.length}</p>
            <p className="text-xs text-muted-foreground">+{tenantsSince30d} last 30d</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active subs</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-bold">{activeSubscriptions}</p>
            <p className="text-xs text-muted-foreground">Stripe active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total leads</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-bold">{totalLeads}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total renders</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-bold">{totalRenders}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan + status breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(planCounts).map(([plan, n]) => (
              <div key={plan} className="flex items-center justify-between text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${planColors[plan] ?? ""}`}>
                  {plan}
                </span>
                <span className="font-medium">{n}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(statusCounts).map(([status, n]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[status] ?? ""}`}>
                  {status.replace("_", " ")}
                </span>
                <span className="font-medium">{n}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tenant table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name / Slug</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Country</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Trial ends</th>
                </tr>
              </thead>
              <tbody>
                {allTenants.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-muted-foreground">{t.slug}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-medium capitalize ${planColors[t.plan] ?? ""}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${statusColors[t.status] ?? ""}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{t.countryCode}</td>
                    <td className="px-4 py-2 text-muted-foreground">{timeAgo(t.createdAt)}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {t.trialEndsAt
                        ? t.trialEndsAt < new Date()
                          ? <span className="text-red-500">Expired</span>
                          : timeAgo(new Date(Date.now() - (t.trialEndsAt.getTime() - Date.now())))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
