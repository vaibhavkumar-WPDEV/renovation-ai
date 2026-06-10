import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, reviewRequests, tenantSettings } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewSettingsForm } from "./ReviewSettingsForm";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", cls: "bg-sky-100 text-sky-700" },
  rated_public: { label: "Public ⭐", cls: "bg-green-100 text-green-700" },
  rated_private: { label: "Private feedback", cls: "bg-amber-100 text-amber-700" },
};

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default async function ReviewsPage() {
  let rows: Array<{
    request: typeof reviewRequests.$inferSelect;
    leadName: string | null;
  }> = [];
  let config: {
    googleReviewUrl?: string;
    yelpReviewUrl?: string;
    autoSend?: boolean;
    autoSendAfterDays?: number;
  } | null = null;

  try {
    const { tenant } = await requireTenant();
    const data = await db
      .select({ request: reviewRequests, leadName: leads.fullName })
      .from(reviewRequests)
      .leftJoin(leads, eq(reviewRequests.leadId, leads.id))
      .where(eq(reviewRequests.tenantId, tenant.id))
      .orderBy(desc(reviewRequests.createdAt))
      .limit(100);
    rows = data;
    const [settings] = await db
      .select({ reviewConfig: tenantSettings.reviewConfig })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenant.id))
      .limit(1);
    config = settings?.reviewConfig ?? null;
  } catch {
    // not authenticated
  }

  const rated = rows.filter((r) => r.request.rating !== null);
  const avgRating =
    rated.length > 0
      ? (rated.reduce((sum, r) => sum + (r.request.rating ?? 0), 0) / rated.length).toFixed(1)
      : "—";
  const publicCount = rows.filter((r) => r.request.responseStatus === "rated_public").length;
  const privateCount = rows.filter((r) => r.request.responseStatus === "rated_private").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Happy customers get routed to Google. Unhappy ones reach you privately first.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Requests sent", value: rows.length },
          { label: "Avg rating", value: avgRating },
          { label: "Routed to Google", value: publicCount },
          { label: "Caught privately", value: privateCount },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle>Review routing</CardTitle>
          <CardDescription>
            4–5 star customers are invited to post publicly. Lower ratings come to you privately
            with an AI-drafted recovery reply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewSettingsForm initial={config} />
        </CardContent>
      </Card>

      {/* Requests */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No review requests yet. Send one from any lead&apos;s detail page, or enable
              auto-send above to request reviews automatically after projects are won.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Rating</th>
                <th className="px-4 py-3 text-left font-medium">Feedback</th>
                <th className="px-4 py-3 text-left font-medium">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ request, leadName }) => {
                const badge = STATUS_BADGE[request.responseStatus ?? "pending"] ?? STATUS_BADGE.pending;
                return (
                  <tr key={request.id} className="align-top hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{leadName ?? "Unknown"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {request.rating !== null ? `${"⭐".repeat(request.rating)}` : "—"}
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      {request.feedback ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            {request.feedback.slice(0, 60)}
                            {request.feedback.length > 60 ? "…" : ""}
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap">{request.feedback}</p>
                          {request.aiResponseDraft && (
                            <div className="mt-3 rounded-lg bg-muted p-3">
                              <p className="mb-1 font-medium">AI-suggested reply:</p>
                              <p className="whitespace-pre-wrap">{request.aiResponseDraft}</p>
                            </div>
                          )}
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {request.sentAt ? timeAgo(new Date(request.sentAt)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
