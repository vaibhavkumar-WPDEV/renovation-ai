/**
 * AI review-response drafter.
 *
 * When a homeowner leaves private feedback (rating below the public
 * threshold), Haiku drafts an empathetic owner reply for the contractor to
 * review, edit, and send. Drafts are never sent automatically — the owner
 * always approves.
 */
import { anthropic, MODELS } from "./anthropic";

const SYSTEM_PROMPT = `You draft replies for home renovation contractors responding to customer feedback. The reply will be reviewed and sent by the business owner personally.

Rules:
- Warm, accountable, and specific to the feedback given. Never defensive.
- Acknowledge the issue, take ownership, and offer a concrete next step (a call from the owner, a visit to make it right).
- 3-5 sentences. No subject line, no signature, no placeholders like [Name].
- Never promise refunds, discounts, or specific compensation.
- Output only the reply text, nothing else.`;

export async function draftFeedbackResponse(opts: {
  tenantName: string;
  leadName: string | null;
  rating: number;
  feedback: string;
}): Promise<string> {
  const res = await anthropic().messages.create({
    model: MODELS.fast,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Business: ${opts.tenantName}
Customer: ${opts.leadName ?? "a customer"}
Rating: ${opts.rating}/5
Their feedback: ${opts.feedback}`,
      },
    ],
  });

  return res.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
}
