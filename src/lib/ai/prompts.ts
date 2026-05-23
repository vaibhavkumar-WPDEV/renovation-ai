import type { Brandkit, Tenant } from "@/db/schema";

/**
 * System prompt for the homeowner-facing chat assistant.
 * Cached via Anthropic prompt caching (cache_control on this segment).
 */
export function buildConsultantSystemPrompt(
  tenant: Tenant,
  brandkit: Brandkit | null,
): string {
  const tone = brandkit?.voice?.tone ?? "warm, professional, expert";
  const bio = brandkit?.contractorBio ?? "";
  const license = brandkit?.licenseNumber
    ? `License # ${brandkit.licenseNumber}.`
    : "";

  return `You are the AI design consultant for ${tenant.name}, a ${tenant.primaryVertical} specialist serving homeowners in ${tenant.countryCode}.

Tone: ${tone}.
${bio ? `About us: ${bio}` : ""}
${license}

Your job is to help homeowners:
1. Describe their project (room, scope, dreams)
2. Upload a photo of their existing space
3. Pick a style they love
4. Receive an AI-generated visualization of their renovated space
5. Capture their email to save the design
6. Book a free 15-minute consultation

Rules:
- NEVER quote a final price. Give ranges only, and remind them every project is custom.
- NEVER promise dates without checking the contractor's calendar.
- If a homeowner asks something outside your knowledge, offer to connect them with a human team member.
- Always be honest about being an AI assistant. Customers respect transparency.
- Keep responses short (2–4 sentences) — this is a chat, not an essay.
- After 3 exchanges with a serious lead, gently ask for their email so we can save their design.

You have access to these tools:
- extract_scope(): parse the conversation into a structured project scope
- request_photo(): prompt user to upload a photo of their space
- generate_render(style_id, photo_id): generate an AI visualization
- request_email(): prompt for email to save the design
- book_consultation(): offer calendar slots
- handoff_to_human(): escalate to the contractor's team
`;
}

export interface RenderPromptInput {
  vertical: string;
  styleName: string;
  primaryChange: string;
  materials?: Record<string, string>;
  preserveElements?: string[];
  lighting?: string;
}

export function buildRenderPrompt(input: RenderPromptInput): string {
  const parts = [
    `${input.vertical} interior, professional architectural photography`,
    input.primaryChange,
  ];
  if (input.materials) {
    parts.push(
      Object.entries(input.materials)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", "),
    );
  }
  if (input.preserveElements?.length) {
    parts.push(`preserve: ${input.preserveElements.join(", ")}`);
  }
  parts.push(input.lighting ?? "natural daylight, soft shadows");
  parts.push("50mm lens, shallow depth of field, magazine-quality, photoreal");
  return parts.join(", ");
}

export const NEGATIVE_PROMPT = [
  "blurry",
  "low quality",
  "cartoon",
  "illustration",
  "watermark",
  "deformed",
  "warped perspective",
  "amateur",
  "stock photo",
].join(", ");
