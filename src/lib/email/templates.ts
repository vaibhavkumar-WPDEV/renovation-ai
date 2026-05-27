/**
 * Plain-HTML email templates for the follow-up cadence.
 * No React Email dependency — keeps the bundle small and edge-compatible.
 */

interface FollowUpEmail {
  tenantName: string;
  leadName: string;
  accentColor: string;
  renderUrl?: string;
  widgetUrl: string;
}

export function followUp1Html({
  tenantName,
  leadName,
  accentColor,
  renderUrl,
  widgetUrl,
}: FollowUpEmail): string {
  const greeting = leadName ? `Hi ${leadName.split(" ")[0]},` : "Hi there,";
  const renderSection = renderUrl
    ? `<p style="margin:16px 0">Your AI design is ready to view:</p>
       <p style="margin:16px 0"><a href="${renderUrl}" style="background:${accentColor};color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View your design →</a></p>`
    : `<p style="margin:16px 0"><a href="${widgetUrl}" style="background:${accentColor};color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Generate your AI design →</a></p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
    <p style="font-size:22px;font-weight:700;margin:0 0 4px">${tenantName}</p>
    <p style="color:#64748b;font-size:13px;margin:0 0 24px">AI Design Studio</p>

    <p style="margin:0 0 16px">${greeting}</p>
    <p style="margin:0 0 16px">Your AI renovation design is ready — see exactly how your space could look after the project.</p>

    ${renderSection}

    <p style="margin:24px 0 8px;font-size:14px;color:#64748b">Questions? Reply to this email or book a free 15-minute call.</p>
    <p style="margin:0;font-size:14px;color:#94a3b8">— The ${tenantName} team</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">
    You received this because you used the AI design tool on our website.
    <a href="#" style="color:#94a3b8">Unsubscribe</a>
  </p>
</body>
</html>`;
}

export function followUp2Html({
  tenantName,
  leadName,
  accentColor,
  widgetUrl,
}: FollowUpEmail): string {
  const greeting = leadName ? `Hi ${leadName.split(" ")[0]},` : "Hi there,";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
    <p style="font-size:22px;font-weight:700;margin:0 0 4px">${tenantName}</p>
    <p style="color:#64748b;font-size:13px;margin:0 0 24px">AI Design Studio</p>

    <p style="margin:0 0 16px">${greeting}</p>
    <p style="margin:0 0 16px">Just wanted to check in — we're currently booking consultations for next month. Spots fill up fast, especially for kitchen and bath projects.</p>
    <p style="margin:0 0 24px">A 15-minute call is completely free and there's no obligation.</p>

    <p style="margin:16px 0"><a href="${widgetUrl}" style="background:${accentColor};color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Book a free consultation →</a></p>

    <p style="margin:24px 0 8px;font-size:14px;color:#64748b">Not ready yet? No worries — your AI design is saved and waiting whenever you are.</p>
    <p style="margin:0;font-size:14px;color:#94a3b8">— The ${tenantName} team</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">
    You received this because you used the AI design tool on our website.
    <a href="#" style="color:#94a3b8">Unsubscribe</a>
  </p>
</body>
</html>`;
}

export function followUp1Subject(tenantName: string): string {
  return `Your AI renovation design is ready — ${tenantName}`;
}

export function followUp2Subject(tenantName: string): string {
  return `Limited consult spots available — ${tenantName}`;
}

export function trialReminderSubject(daysLeft: number): string {
  return daysLeft <= 1
    ? "Your RenovateAI trial ends tomorrow"
    : `Your RenovateAI trial ends in ${daysLeft} days`;
}

export function trialReminderHtml({
  contractorName,
  daysLeft,
  upgradeUrl,
}: {
  contractorName: string;
  daysLeft: number;
  upgradeUrl: string;
}): string {
  const greeting = contractorName ? `Hi ${contractorName.split(" ")[0]},` : "Hi,";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
    <p style="font-size:22px;font-weight:700;margin:0 0 4px">RenovateAI</p>
    <p style="margin:16px 0">${greeting}</p>
    <p style="margin:0 0 16px">Your free trial ends ${daysLeft <= 1 ? "tomorrow" : `in ${daysLeft} days`}. Keep your AI design studio, lead capture, and follow-up running without interruption.</p>
    <p style="margin:16px 0"><a href="${upgradeUrl}" style="background:#F59E0B;color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Choose your plan →</a></p>
    <p style="margin:24px 0 0;font-size:14px;color:#94a3b8">Questions? Just reply to this email.</p>
  </div>
</body>
</html>`;
}
