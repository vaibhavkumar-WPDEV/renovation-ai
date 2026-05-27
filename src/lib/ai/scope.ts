/**
 * AI Project Scope Analyzer.
 *
 * Turns a messy chat transcript (and optional photos) into a structured project
 * scope: dimensions, materials, timeline, budget band, with a confidence score.
 * Powers the Budget Estimator and Proposal Generator downstream.
 */
import { anthropic, MODELS } from "./anthropic";
import type { Vertical } from "@/db/schema";

export interface AnalyzedScope {
  vertical: Vertical;
  dimensions: {
    widthFt?: number;
    lengthFt?: number;
    heightFt?: number;
    linearFt?: number;
    sqFt?: number;
  };
  materials: {
    cabinets?: string;
    countertop?: string;
    backsplash?: string;
    flooring?: string;
    hardware?: string;
  };
  timeline?: string;
  budgetBand?: string;
  confidence: number; // 0-100
  rawNotes?: string;
}

const VERTICALS = [
  "cabinetry",
  "bathroom",
  "kitchen",
  "landscaping",
  "pool",
  "outdoor_structures",
  "full_renovation",
] as const;

const SYSTEM_PROMPT = `You extract structured renovation project scopes from homeowner conversations. Output ONLY valid JSON (no markdown) matching:
{
  "vertical": one of ${VERTICALS.join("|")},
  "dimensions": {"widthFt"?: number, "lengthFt"?: number, "heightFt"?: number, "linearFt"?: number, "sqFt"?: number},
  "materials": {"cabinets"?: string, "countertop"?: string, "backsplash"?: string, "flooring"?: string, "hardware"?: string},
  "timeline"?: string,
  "budgetBand"?: string,
  "confidence": number (0-100, how complete/certain the scope is),
  "rawNotes"?: string (anything notable not captured above)
}

Rules:
- Only include fields you can reasonably infer. Omit unknown fields rather than guessing wildly.
- For kitchens/cabinetry, estimate linearFt of cabinetry and sqFt of countertop if the homeowner gives room size.
- confidence reflects how much real detail you had — a vague "redo my kitchen" is low (20-40); specific dimensions + materials is high (70-95).`;

export async function analyzeScope(opts: {
  transcript: string;
  verticalHint?: Vertical;
  photoUrls?: string[];
}): Promise<AnalyzedScope> {
  const { transcript, verticalHint, photoUrls } = opts;

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "url"; url: string } }
  > = [
    {
      type: "text",
      text: `Extract the project scope from this conversation${
        verticalHint ? ` (likely a ${verticalHint} project)` : ""
      }:\n\n${transcript}`,
    },
  ];

  // Attach up to 3 photos for visual context (Claude vision)
  for (const url of (photoUrls ?? []).slice(0, 3)) {
    if (url.startsWith("http")) {
      content.push({ type: "image", source: { type: "url", url } });
    }
  }

  const res = await anthropic().messages.create({
    model: MODELS.primary,
    max_tokens: 1024,
    system: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } as any },
    ],
    messages: [{ role: "user", content }],
  });

  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(jsonText) as AnalyzedScope;

  // Guard the vertical against the enum
  if (!VERTICALS.includes(parsed.vertical)) {
    parsed.vertical = verticalHint ?? "cabinetry";
  }
  parsed.confidence = Math.max(0, Math.min(100, parsed.confidence ?? 50));
  return parsed;
}
