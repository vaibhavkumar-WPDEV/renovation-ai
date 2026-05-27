import { and, eq } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/db/client";
import { tenants, users } from "@/db/schema";
import { sendEmail } from "@/lib/email/send";
import { trialReminderHtml, trialReminderSubject } from "@/lib/email/templates";
import { env } from "@/lib/env";

/**
 * Daily cron: email contractors whose free trial ends in 3 days or 1 day.
 * Firing only on those two day-counts keeps it near-idempotent with a daily
 * schedule (no extra tracking column needed).
 */
export const trialReminders = inngest.createFunction(
  { id: "trial-reminders", name: "Trial expiry reminders" },
  { cron: "0 14 * * *" }, // 14:00 UTC daily
  async ({ step }) => {
    const dueTenants = await step.run("find-expiring-trials", async () => {
      const trialing = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          trialEndsAt: tenants.trialEndsAt,
        })
        .from(tenants)
        .where(eq(tenants.status, "trialing"));

      const now = Date.now();
      return trialing
        .map((t) => ({
          ...t,
          daysLeft: t.trialEndsAt
            ? Math.ceil((new Date(t.trialEndsAt).getTime() - now) / 86_400_000)
            : null,
        }))
        .filter((t) => t.daysLeft === 3 || t.daysLeft === 1);
    });

    if (dueTenants.length === 0) return { sent: 0 };

    let sent = 0;
    for (const tenant of dueTenants) {
      await step.run(`notify-${tenant.id}`, async () => {
        const [owner] = await db
          .select({ email: users.email, fullName: users.fullName })
          .from(users)
          .where(and(eq(users.tenantId, tenant.id), eq(users.role, "owner")))
          .limit(1);
        if (!owner?.email) return;

        await sendEmail({
          to: owner.email,
          subject: trialReminderSubject(tenant.daysLeft!),
          html: trialReminderHtml({
            contractorName: owner.fullName ?? "",
            daysLeft: tenant.daysLeft!,
            upgradeUrl: `${env.NEXT_PUBLIC_APP_URL}/pricing`,
          }),
        });
        sent++;
      });
    }

    return { sent, candidates: dueTenants.length };
  },
);
