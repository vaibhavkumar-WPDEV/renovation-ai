import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brandkits, leads, reviewRequests, tenants } from "@/db/schema";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rate your experience",
  robots: { index: false, follow: false },
};

export default async function PublicReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [request] = await db
    .select()
    .from(reviewRequests)
    .where(eq(reviewRequests.accessToken, token))
    .limit(1);
  if (!request) notFound();

  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, request.tenantId))
    .limit(1);
  if (!tenant) notFound();

  const [brandkit] = await db
    .select({
      logoUrl: brandkits.logoUrl,
      primaryColor: brandkits.primaryColor,
      accentColor: brandkits.accentColor,
    })
    .from(brandkits)
    .where(eq(brandkits.tenantId, request.tenantId))
    .limit(1);

  const [lead] = await db
    .select({ fullName: leads.fullName })
    .from(leads)
    .where(eq(leads.id, request.leadId))
    .limit(1);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {brandkit?.logoUrl ? (
          <img src={brandkit.logoUrl} alt={tenant.name} className="mb-5 h-10 w-auto" />
        ) : (
          <p
            className="mb-5 text-xl font-bold"
            style={{ color: brandkit?.primaryColor ?? "#0F172A" }}
          >
            {tenant.name}
          </p>
        )}

        <ReviewForm
          token={token}
          tenantName={tenant.name}
          leadName={lead?.fullName ?? null}
          accentColor={brandkit?.accentColor ?? "#F59E0B"}
          alreadyRated={request.rating}
        />
      </div>
    </main>
  );
}
