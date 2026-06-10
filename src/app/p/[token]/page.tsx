import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  brandkits,
  estimates,
  leads,
  projectScopes,
  proposals,
  renders,
  tenants,
} from "@/db/schema";
import { env } from "@/lib/env";
import { ProposalActions } from "./ProposalActions";

export const dynamic = "force-dynamic";

function renderOutputUrl(r2Key: string | null): string | null {
  if (!r2Key) return null;
  if (r2Key.startsWith("http")) return r2Key;
  if (env.R2_PUBLIC_URL) return `${env.R2_PUBLIC_URL}/${r2Key}`;
  return null;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const [row] = await db
    .select({ title: proposals.title })
    .from(proposals)
    .where(eq(proposals.accessToken, token))
    .limit(1);
  return {
    title: row?.title ?? "Project proposal",
    robots: { index: false, follow: false },
  };
}

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;

  const [proposal] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.accessToken, token))
    .limit(1);
  if (!proposal) notFound();

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, proposal.tenantId))
    .limit(1);
  if (!tenant) notFound();

  const [brandkit] = await db
    .select()
    .from(brandkits)
    .where(eq(brandkits.tenantId, tenant.id))
    .limit(1);

  const [scope] = await db
    .select()
    .from(projectScopes)
    .where(eq(projectScopes.id, proposal.scopeId))
    .limit(1);

  const [estimate] = proposal.estimateId
    ? await db.select().from(estimates).where(eq(estimates.id, proposal.estimateId)).limit(1)
    : [undefined];

  const [lead] = proposal.leadId
    ? await db.select().from(leads).where(eq(leads.id, proposal.leadId)).limit(1)
    : [undefined];

  const leadRenders = proposal.leadId
    ? await db
        .select({ id: renders.id, outputR2Key: renders.outputR2Key })
        .from(renders)
        .where(and(eq(renders.leadId, proposal.leadId), eq(renders.status, "completed")))
        .orderBy(desc(renders.createdAt))
        .limit(4)
    : [];
  const renderUrls = leadRenders
    .map((r) => renderOutputUrl(r.outputR2Key))
    .filter((u): u is string => !!u);

  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const isExpired =
    !proposal.signedAt && !!proposal.expiresAt && proposal.expiresAt.getTime() < nowMs;

  // First open by the homeowner: sent → viewed (non-blocking)
  if (proposal.status === "sent") {
    db.update(proposals)
      .set({ status: "viewed", viewedAt: new Date() })
      .where(eq(proposals.id, proposal.id))
      .catch(() => {});
  }

  const accent = brandkit?.accentColor ?? "#F59E0B";
  const primary = brandkit?.primaryColor ?? "#0F172A";
  const content = proposal.content;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 print:bg-white print:py-0">
      <article className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <header
          className="rounded-2xl p-8 text-white print:rounded-none"
          style={{ backgroundColor: primary }}
        >
          {brandkit?.logoUrl && (
            <img src={brandkit.logoUrl} alt={tenant.name} className="mb-4 h-10 w-auto" />
          )}
          <p className="text-sm uppercase tracking-widest opacity-70">Project proposal</p>
          <h1 className="mt-1 text-3xl font-bold">{proposal.title ?? tenant.name}</h1>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm opacity-80">
            {lead?.fullName && <span>Prepared for {lead.fullName}</span>}
            <span>
              {proposal.createdAt.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {brandkit?.licenseNumber && <span>License {brandkit.licenseNumber}</span>}
          </div>
        </header>

        {isExpired && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            This proposal has expired. Contact {tenant.name} for a refreshed quote — pricing may
            have changed.
          </div>
        )}

        {/* Intro letter */}
        {content?.intro && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <p className="leading-relaxed">{content.intro}</p>
          </section>
        )}

        {/* Renders */}
        {renderUrls.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="mb-4 text-lg font-semibold">Your design concepts</h2>
            <div className={`grid gap-4 ${renderUrls.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {renderUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="AI design concept"
                  className="w-full rounded-xl border border-slate-200"
                />
              ))}
            </div>
          </section>
        )}

        {/* Scope */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="mb-4 text-lg font-semibold">Scope of work</h2>
          {content?.scopeSummary && (
            <p className="mb-5 leading-relaxed text-slate-700">{content.scopeSummary}</p>
          )}
          {scope && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Project type</dt>
                <dd className="font-medium capitalize">{scope.vertical.replace(/_/g, " ")}</dd>
              </div>
              {scope.timeline && (
                <div>
                  <dt className="text-slate-500">Timeline</dt>
                  <dd className="font-medium">{scope.timeline}</dd>
                </div>
              )}
              {scope.dimensions &&
                Object.entries(scope.dimensions).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              {scope.materials &&
                Object.entries(scope.materials).map(([k, v]) => (
                  <div key={k}>
                    <dt className="capitalize text-slate-500">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          )}
        </section>

        {/* Investment */}
        {estimate && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="mb-1 text-lg font-semibold">Your investment</h2>
            <p
              className="text-3xl font-bold tracking-tight"
              style={{ color: primary }}
            >
              {money(estimate.lowCents, estimate.currency)} –{" "}
              {money(estimate.highCents, estimate.currency)}
            </p>
            <table className="mt-5 w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {estimate.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td className="py-2">{li.label}</td>
                    <td className="py-2 text-right text-slate-500">
                      {li.quantity} {li.unit}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {money(li.totalCents, estimate.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!!proposal.depositCents && proposal.depositCents > 0 && (
              <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                A deposit of{" "}
                <strong className="text-slate-900">
                  {money(proposal.depositCents, estimate.currency)}
                </strong>{" "}
                secures your project slot. The balance follows the payment schedule agreed at
                kickoff.
              </p>
            )}
          </section>
        )}

        {/* Why us + process */}
        {(content?.whyUs || (content?.processSteps?.length ?? 0) > 0) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            {content?.whyUs && (
              <>
                <h2 className="mb-3 text-lg font-semibold">Why {tenant.name}</h2>
                <p className="mb-6 leading-relaxed text-slate-700">{content.whyUs}</p>
              </>
            )}
            {(content?.processSteps?.length ?? 0) > 0 && (
              <>
                <h2 className="mb-4 text-lg font-semibold">What happens next</h2>
                <ol className="space-y-3">
                  {content!.processSteps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: accent }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-slate-600">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}

        {/* Terms */}
        {content?.terms && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="mb-3 text-lg font-semibold">Terms</h2>
            <p className="text-sm leading-relaxed text-slate-600">{content.terms}</p>
          </section>
        )}

        {/* Sign + deposit */}
        <ProposalActions
          token={token}
          status={proposal.status}
          signerName={proposal.signerName}
          signedAt={proposal.signedAt?.toISOString() ?? null}
          depositCents={proposal.depositCents}
          currency={estimate?.currency ?? tenant.currency}
          accentColor={accent}
          expired={isExpired}
          tenantName={tenant.name}
          justPaid={paid === "1"}
        />

        <footer className="pb-10 text-center text-xs text-slate-400 print:hidden">
          {tenant.name}
          {brandkit?.insuranceNote ? ` · ${brandkit.insuranceNote}` : ""} · Powered by AI design
          technology
        </footer>
      </article>
    </main>
  );
}
