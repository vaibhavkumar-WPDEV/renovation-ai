import { env } from "@/lib/env";

/**
 * Reusable transactional email sender. No-ops with a log line when Resend
 * isn't configured, so flows never crash in dev / unconfigured environments.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  const from = opts.from ?? env.RESEND_FROM_EMAIL;
  if (!env.RESEND_API_KEY) {
    console.log(`[email] Resend not configured — would send "${opts.subject}" to ${opts.to}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
}
