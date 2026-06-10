import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, reviewRequests, tenantSettings, tenants, users } from "@/db/schema";
import { rateLimit, ipFromRequest } from "@/lib/security/rateLimit";
import { draftFeedbackResponse } from "@/lib/ai/review";
import { sendEmail } from "@/lib/email/send";
import { lowRatingAlertHtml, lowRatingAlertSubject } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { audit } from "@/lib/security/audit";

// 4-5 stars → invite a public review; below → capture privately
const PUBLIC_THRESHOLD = 4;

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(4000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const limited = rateLimit(`review-rate:${ipFromRequest(req)}`, 10, 60_000);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const [request] = await db
    .select()
    .from(reviewRequests)
    .where(eq(reviewRequests.accessToken, token))
    .limit(1);
  if (!request) {
    return NextResponse.json({ error: "Review link not found" }, { status: 404 });
  }

  const { rating, feedback } = parsed.data;

  // First submission locks the rating; later calls may only add feedback
  if (request.respondedAt && request.rating !== null) {
    if (!feedback || request.rating >= PUBLIC_THRESHOLD) {
      return NextResponse.json({ error: "Already submitted. Thank you!" }, { status: 409 });
    }
  }

  const lockedRating = request.rating ?? rating;
  const lockedPublic = lockedRating >= PUBLIC_THRESHOLD;

  await db
    .update(reviewRequests)
    .set({
      rating: lockedRating,
      feedback: feedback ?? request.feedback,
      respondedAt: request.respondedAt ?? new Date(),
      responseStatus: lockedPublic ? "rated_public" : "rated_private",
    })
    .where(eq(reviewRequests.id, request.id));

  await audit({
    tenantId: request.tenantId,
    action: "review.submitted",
    entity: "review_request",
    entityId: request.id,
    before: { rating: request.rating, responseStatus: request.responseStatus },
    after: { rating: lockedRating, feedback: feedback ?? null, responseStatus: lockedPublic ? "rated_public" : "rated_private" },
    req,
  });

  // Public path: hand back the contractor's review links
  if (lockedPublic) {
    const [settings] = await db
      .select({ reviewConfig: tenantSettings.reviewConfig })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, request.tenantId))
      .limit(1);
    return NextResponse.json({
      ok: true,
      public: true,
      googleReviewUrl: settings?.reviewConfig?.googleReviewUrl ?? null,
      yelpReviewUrl: settings?.reviewConfig?.yelpReviewUrl ?? null,
    });
  }

  // Private path: alert the owner with an AI-drafted reply — best-effort
  try {
    const [tenant] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, request.tenantId))
      .limit(1);
    const [lead] = await db
      .select({ fullName: leads.fullName })
      .from(leads)
      .where(eq(leads.id, request.leadId))
      .limit(1);

    let aiDraft: string | null = null;
    if (feedback && env.ANTHROPIC_API_KEY && tenant) {
      try {
        aiDraft = await draftFeedbackResponse({
          tenantName: tenant.name,
          leadName: lead?.fullName ?? null,
          rating: lockedRating,
          feedback,
        });
        await db
          .update(reviewRequests)
          .set({ aiResponseDraft: aiDraft })
          .where(eq(reviewRequests.id, request.id));
      } catch (err) {
        console.error("[review] AI draft failed:", err);
      }
    }

    const [owner] = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.tenantId, request.tenantId), eq(users.role, "owner")))
      .limit(1);
    if (owner?.email && (feedback || !request.respondedAt)) {
      await sendEmail({
        to: owner.email,
        subject: lowRatingAlertSubject(lead?.fullName ?? null, lockedRating),
        html: lowRatingAlertHtml({
          leadName: lead?.fullName ?? null,
          rating: lockedRating,
          feedback: feedback ?? null,
          aiDraft,
          dashboardUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/reviews`,
        }),
      });
    }
  } catch (err) {
    console.error("[review] owner alert failed:", err);
  }

  return NextResponse.json({ ok: true, public: false });
}
