import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/db/client";
import { brandkits, leads, reviewRequests, tenantSettings, tenants } from "@/db/schema";
import { sendEmail } from "@/lib/email/send";
import { reviewRequestHtml, reviewRequestSubject } from "@/lib/email/templates";
import { env } from "@/lib/env";

/**
 * Daily cron: tenants with auto-send enabled get review requests fired to
 * leads won N days ago (default 14). One request per lead, ever — the
 * existence check makes the daily schedule idempotent.
 */
export const autoReviewRequests = inngest.createFunction(
  { id: "auto-review-requests", name: "Auto review requests for won projects" },
  { cron: "0 16 * * *" }, // 16:00 UTC daily
  async ({ step }) => {
    const candidates = await step.run("find-due-leads", async () => {
      const enabled = await db
        .select({
          tenantId: tenantSettings.tenantId,
          reviewConfig: tenantSettings.reviewConfig,
        })
        .from(tenantSettings)
        .where(isNotNull(tenantSettings.reviewConfig));

      const active = enabled.filter((s) => s.reviewConfig?.autoSend);
      if (active.length === 0) return [];

      const result: Array<{ tenantId: string; leadId: string }> = [];
      for (const settings of active) {
        const afterDays = settings.reviewConfig?.autoSendAfterDays ?? 14;
        const cutoff = new Date(Date.now() - afterDays * 86_400_000);

        const wonLeads = await db
          .select({ id: leads.id })
          .from(leads)
          .where(
            and(
              eq(leads.tenantId, settings.tenantId),
              eq(leads.stage, "won"),
              lt(leads.updatedAt, cutoff),
            ),
          )
          .limit(50);
        if (wonLeads.length === 0) continue;

        const existing = await db
          .select({ leadId: reviewRequests.leadId })
          .from(reviewRequests)
          .where(
            inArray(
              reviewRequests.leadId,
              wonLeads.map((l) => l.id),
            ),
          );
        const requested = new Set(existing.map((r) => r.leadId));

        for (const lead of wonLeads) {
          if (!requested.has(lead.id)) {
            result.push({ tenantId: settings.tenantId, leadId: lead.id });
          }
        }
      }
      return result;
    });

    if (candidates.length === 0) return { sent: 0 };

    let sent = 0;
    for (const { tenantId, leadId } of candidates) {
      await step.run(`request-${leadId}`, async () => {
        const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
        if (!lead?.email) return;

        const [tenant] = await db
          .select({ name: tenants.name })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);
        if (!tenant) return;

        const [brandkit] = await db
          .select({ accentColor: brandkits.accentColor })
          .from(brandkits)
          .where(eq(brandkits.tenantId, tenantId))
          .limit(1);

        const accessToken = randomBytes(24).toString("base64url");
        await db.insert(reviewRequests).values({
          tenantId,
          leadId,
          accessToken,
          sentAt: new Date(),
          responseStatus: "sent",
        });

        await sendEmail({
          to: lead.email,
          subject: reviewRequestSubject(tenant.name),
          html: reviewRequestHtml({
            tenantName: tenant.name,
            leadName: lead.fullName,
            accentColor: brandkit?.accentColor ?? "#F59E0B",
            reviewUrl: `${env.NEXT_PUBLIC_APP_URL}/r/${accessToken}`,
          }),
        });
        sent++;
      });
    }

    return { sent };
  },
);
