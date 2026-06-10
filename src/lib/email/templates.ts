/**
 * Plain-HTML email templates for the follow-up cadence.
 * No React Email dependency — keeps the bundle small and edge-compatible.
 */

/** Escape user-controlled text before interpolating into HTML emails. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const greeting = leadName ? `Hi ${escapeHtml(leadName.split(" ")[0])},` : "Hi there,";
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
  const greeting = leadName ? `Hi ${escapeHtml(leadName.split(" ")[0])},` : "Hi there,";
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

export function proposalSubject(tenantName: string): string {
  return `Your project proposal is ready — ${tenantName}`;
}

export function proposalHtml({
  tenantName,
  leadName,
  accentColor,
  proposalUrl,
  expiresAt,
}: {
  tenantName: string;
  leadName: string | null;
  accentColor: string;
  proposalUrl: string;
  expiresAt: Date | null;
}): string {
  const greeting = leadName ? `Hi ${escapeHtml(leadName.split(" ")[0])},` : "Hi there,";
  const expiry = expiresAt
    ? `<p style="margin:24px 0 8px;font-size:14px;color:#64748b">This proposal is valid until ${expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>`
    : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
    <p style="font-size:22px;font-weight:700;margin:0 0 4px">${tenantName}</p>
    <p style="color:#64748b;font-size:13px;margin:0 0 24px">Project Proposal</p>

    <p style="margin:0 0 16px">${greeting}</p>
    <p style="margin:0 0 16px">Your personalized project proposal is ready — including your design concepts, detailed scope, and investment range.</p>

    <p style="margin:16px 0"><a href="${proposalUrl}" style="background:${accentColor};color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View your proposal →</a></p>

    ${expiry}
    <p style="margin:0;font-size:14px;color:#94a3b8">— The ${tenantName} team</p>
  </div>
</body>
</html>`;
}

export function proposalSignedSubject(leadName: string | null): string {
  return `🎉 Proposal signed${leadName ? ` by ${leadName}` : ""}`;
}

export function proposalSignedHtml({
  leadName,
  signerName,
  dashboardUrl,
}: {
  leadName: string | null;
  signerName: string;
  dashboardUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
    <p style="font-size:22px;font-weight:700;margin:0 0 16px">Proposal signed ✓</p>
    <p style="margin:0 0 16px">${escapeHtml(signerName)} just accepted the proposal${leadName ? ` for ${escapeHtml(leadName)}'s project` : ""}. They've been prompted to pay the deposit to secure their slot.</p>
    <p style="margin:16px 0"><a href="${dashboardUrl}" style="background:#F59E0B;color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Open the lead →</a></p>
    <p style="margin:24px 0 0;font-size:14px;color:#94a3b8">— RenovateAI</p>
  </div>
</body>
</html>`;
}

export function reviewRequestSubject(tenantName: string): string {
  return `How did we do? — ${tenantName}`;
}

export function reviewRequestHtml({
  tenantName,
  leadName,
  accentColor,
  reviewUrl,
}: {
  tenantName: string;
  leadName: string | null;
  accentColor: string;
  reviewUrl: string;
}): string {
  const greeting = leadName ? `Hi ${escapeHtml(leadName.split(" ")[0])},` : "Hi there,";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
    <p style="font-size:22px;font-weight:700;margin:0 0 24px">${tenantName}</p>

    <p style="margin:0 0 16px">${greeting}</p>
    <p style="margin:0 0 16px">Thank you for trusting us with your project! It would mean the world to us if you could share how your experience went — it takes less than a minute.</p>

    <p style="margin:16px 0"><a href="${reviewUrl}" style="background:${accentColor};color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Rate your experience →</a></p>

    <p style="margin:24px 0 0;font-size:14px;color:#94a3b8">— The ${tenantName} team</p>
  </div>
</body>
</html>`;
}

export function lowRatingAlertSubject(leadName: string | null, rating: number): string {
  return `⚠️ ${rating}-star feedback${leadName ? ` from ${leadName}` : ""} — needs your attention`;
}

export function lowRatingAlertHtml({
  leadName,
  rating,
  feedback,
  aiDraft,
  dashboardUrl,
}: {
  leadName: string | null;
  rating: number;
  feedback: string | null;
  aiDraft: string | null;
  dashboardUrl: string;
}): string {
  const feedbackBlock = feedback
    ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b">What they said:</p>
       <blockquote style="margin:0 0 16px;padding:12px 16px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:0 8px 8px 0;font-size:14px">${escapeHtml(feedback)}</blockquote>`
    : "";
  const draftBlock = aiDraft
    ? `<p style="margin:16px 0 8px;font-size:13px;color:#64748b">Suggested reply (review &amp; personalize before sending):</p>
       <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #94a3b8;border-radius:0 8px 8px 0;font-size:14px">${escapeHtml(aiDraft)}</blockquote>`
    : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
    <p style="font-size:22px;font-weight:700;margin:0 0 16px">${rating}-star private feedback</p>
    <p style="margin:0 0 16px">${leadName ? escapeHtml(leadName) : "A customer"} rated their experience ${rating}/5. This was caught privately — it has NOT been posted publicly. Reaching out within 24 hours dramatically improves recovery.</p>
    ${feedbackBlock}
    ${draftBlock}
    <p style="margin:16px 0"><a href="${dashboardUrl}" style="background:#F59E0B;color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Open reviews dashboard →</a></p>
    <p style="margin:24px 0 0;font-size:14px;color:#94a3b8">— RenovateAI</p>
  </div>
</body>
</html>`;
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
  const greeting = contractorName ? `Hi ${escapeHtml(contractorName.split(" ")[0])},` : "Hi,";
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
