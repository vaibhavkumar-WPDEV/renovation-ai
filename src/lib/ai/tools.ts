/**
 * Tool definitions exposed to the Claude chat assistant.
 * Each tool corresponds to an internal action handler in src/app/api/widget/chat/route.ts.
 */
import type Anthropic from "@anthropic-ai/sdk";

export const consultantTools: Anthropic.Tool[] = [
  {
    name: "extract_scope",
    description:
      "Extract structured project scope from the conversation. Call this once the homeowner has shared enough detail (room type, rough size, materials, timeline).",
    input_schema: {
      type: "object",
      properties: {
        vertical: {
          type: "string",
          enum: [
            "cabinetry",
            "bathroom",
            "kitchen",
            "landscaping",
            "pool",
            "outdoor_structures",
            "full_renovation",
          ],
        },
        dimensions: {
          type: "object",
          properties: {
            widthFt: { type: "number" },
            lengthFt: { type: "number" },
            heightFt: { type: "number" },
            linearFt: { type: "number" },
            sqFt: { type: "number" },
          },
        },
        materials: { type: "object" },
        timeline: { type: "string" },
        budgetBand: {
          type: "string",
          enum: [
            "under_25k",
            "25_50k",
            "50_100k",
            "100_200k",
            "over_200k",
            "unsure",
          ],
        },
        rawNotes: { type: "string" },
      },
      required: ["vertical"],
    },
  },
  {
    name: "request_photo",
    description: "Ask the homeowner to upload a photo of their current space.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_render",
    description:
      "Generate an AI visualization. Requires a photo already uploaded and a style selected.",
    input_schema: {
      type: "object",
      properties: {
        photoId: { type: "string" },
        styleId: { type: "string" },
        primaryChange: { type: "string" },
      },
      required: ["photoId", "primaryChange"],
    },
  },
  {
    name: "request_email",
    description:
      "Prompt the homeowner for their email so we can save their design and follow up.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
      required: ["reason"],
    },
  },
  {
    name: "book_consultation",
    description:
      "Show calendar slots so the homeowner can book a free 15-min consultation with the contractor.",
    input_schema: {
      type: "object",
      properties: {
        durationMin: { type: "number", default: 15 },
      },
    },
  },
  {
    name: "handoff_to_human",
    description:
      "Escalate to the contractor's team. Use when the homeowner asks something we can't answer, expresses frustration, or has an emergency.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string" },
        urgency: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["reason"],
    },
  },
];
