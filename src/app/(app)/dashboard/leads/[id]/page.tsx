import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chatSessions, estimates, leads, projectScopes, proposals } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScopeEstimatePanel } from "./ScopeEstimatePanel";
import { ProposalPanel } from "./ProposalPanel";

export const dynamic = "force-dynamic";

const TEMP_COLOR: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-400",
  cold: "bg-sky-400",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    notFound();
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.tenantId, tenant.id)))
    .limit(1);
  if (!lead) notFound();

  // Latest chat transcript for this lead
  const [session] = await db
    .select({ messages: chatSessions.messages })
    .from(chatSessions)
    .where(eq(chatSessions.leadId, id))
    .orderBy(desc(chatSessions.createdAt))
    .limit(1);

  const transcript = (session?.messages ?? [])
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  // Latest scope + its latest estimate
  const [scope] = await db
    .select()
    .from(projectScopes)
    .where(eq(projectScopes.leadId, id))
    .orderBy(desc(projectScopes.version))
    .limit(1);

  let estimate = null;
  if (scope) {
    [estimate] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.scopeId, scope.id))
      .orderBy(desc(estimates.version))
      .limit(1);
  }

  // Latest proposal for this lead
  const [proposal] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.leadId, id), eq(proposals.tenantId, tenant.id)))
    .orderBy(desc(proposals.createdAt))
    .limit(1);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/leads" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to leads
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.fullName ?? "Unknown lead"}</h1>
          <p className="text-sm text-muted-foreground">{lead.email ?? lead.phone ?? "No contact info"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${TEMP_COLOR[lead.temperature ?? "cold"]}`} />
          <span className="text-sm font-medium">Score {lead.score ?? 0}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lead details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Stage</dt><dd className="capitalize">{lead.stage.replace(/_/g, " ")}</dd></div>
            <div><dt className="text-muted-foreground">Source</dt><dd>{lead.source ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">ZIP</dt><dd>{lead.zip ?? "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">AI scope &amp; estimate</CardTitle>
        </CardHeader>
        <CardContent>
          <ScopeEstimatePanel
            leadId={lead.id}
            transcript={transcript}
            initialScope={scope ?? null}
            initialEstimate={estimate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <ProposalPanel
            scopeId={scope?.id ?? null}
            hasEstimate={!!estimate}
            initialProposal={
              proposal
                ? {
                    id: proposal.id,
                    status: proposal.status,
                    webUrl: proposal.webUrl,
                    depositCents: proposal.depositCents,
                    signerName: proposal.signerName,
                    expiresAt: proposal.expiresAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
