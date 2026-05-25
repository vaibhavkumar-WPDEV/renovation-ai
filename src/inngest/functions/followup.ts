import { eq } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/db/client";
import { leads, tenants, brandkits, renders } from "@/db/schema";
import { env } from "@/lib/env";
import { followUp1Html, followUp1Subject, followUp2Html, followUp2Subject } from "@/lib/email/templates";

async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from: string;
}) {
  if (!env.RESEND_API_KEY) {
    console.log(`[followup] Resend not configured — would send "${subject}" to ${to}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({ from, to, subject, html });
}

export const runFollowup = inngest.createFunction(
  {
    id: "run-followup",
    name: "Run follow-up cadence",
    retries: 2,
  },
  { event: "lead/scored" },
  async ({ event, step }) => {
    const { temperature, leadId, tenantId } = event.data;
    if (temperature === "cold") {
      return { skipped: true, reason: "cold lead" };
    }

    // Load lead + tenant + brandkit
    const ctx = await step.run("load-context", async () => {
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead?.email) return null;

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (!tenant) return null;

      const [brandkit] = await db
        .select()
        .from(brandkits)
        .where(eq(brandkits.tenantId, tenantId))
        .limit(1);

      // Get the most recent completed render for this lead
      const [latestRender] = await db
        .select()
        .from(renders)
        .where(eq(renders.leadId, leadId))
        .limit(1);

      const renderUrl =
        latestRender?.outputR2Key?.startsWith("http")
          ? latestRender.outputR2Key
          : latestRender?.outputR2Key && env.R2_PUBLIC_URL
          ? `${env.R2_PUBLIC_URL}/${latestRender.outputR2Key}`
          : undefined;

      return {
        email: lead.email,
        fullName: lead.fullName ?? "",
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        accentColor: brandkit?.accentColor ?? "#F59E0B",
        renderUrl,
        widgetUrl: `${env.NEXT_PUBLIC_APP_URL}/embed/${tenant.slug}`,
        fromEmail: env.RESEND_FROM_EMAIL,
      };
    });

    if (!ctx) return { skipped: true, reason: "no email or tenant" };

    // Email 1 — 30 minutes after scoring (while interest is hot)
    await step.sleep("wait-30min", "30m");
    await step.run("send-email-1", () =>
      sendEmail({
        to: ctx.email,
        subject: followUp1Subject(ctx.tenantName),
        html: followUp1Html({
          tenantName: ctx.tenantName,
          leadName: ctx.fullName,
          accentColor: ctx.accentColor,
          renderUrl: ctx.renderUrl,
          widgetUrl: ctx.widgetUrl,
        }),
        from: `${ctx.tenantName} <${ctx.fromEmail}>`,
      }),
    );

    // Email 2 — 24h later (urgency + booking CTA)
    await step.sleep("wait-24h", "24h");
    await step.run("send-email-2", () =>
      sendEmail({
        to: ctx.email,
        subject: followUp2Subject(ctx.tenantName),
        html: followUp2Html({
          tenantName: ctx.tenantName,
          leadName: ctx.fullName,
          accentColor: ctx.accentColor,
          widgetUrl: ctx.widgetUrl,
        }),
        from: `${ctx.tenantName} <${ctx.fromEmail}>`,
      }),
    );

    // SMS nudge — 48h after if Twilio configured and hot lead
    await step.sleep("wait-48h", "48h");
    if (temperature === "hot" && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (lead?.phone) {
        await step.run("send-sms", async () => {
          const twilio = (await import("twilio")).default;
          const client = twilio(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!);
          await client.messages.create({
            from: env.TWILIO_FROM_NUMBER!,
            to: lead.phone!,
            body: `Hi! This is ${ctx.tenantName}. Your AI kitchen design is ready to view. Book a free consult: ${ctx.widgetUrl}`,
          });
        });
      }
    }

    return { ok: true, tenantId, leadId };
  },
);
