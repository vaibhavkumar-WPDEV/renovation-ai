import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { brandkits, tenants, projectScopes, renders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildConsultantSystemPrompt, buildRenderPrompt, NEGATIVE_PROMPT } from "@/lib/ai/prompts";
import { consultantTools } from "@/lib/ai/tools";
import { rateLimit, ipFromRequest } from "@/lib/security/rateLimit";
import { checkLimit, incrementUsage } from "@/lib/usage/meter";
import { retrieveKnowledge, formatKnowledgeForPrompt } from "@/lib/ai/knowledge";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const bodySchema = z.object({
  tenantSlug: z.string(),
  messages: z.array(messageSchema).min(1).max(50),
  sessionId: z.string().optional(),
  photoId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});

type ToolName =
  | "extract_scope"
  | "request_photo"
  | "generate_render"
  | "request_email"
  | "book_consultation"
  | "handoff_to_human";

interface ToolResult {
  type: string;
  content: string;
  data?: Record<string, unknown>;
}

async function handleToolCall(
  toolName: ToolName,
  toolInput: Record<string, unknown>,
  ctx: { tenantId: string; leadId?: string; photoId?: string },
): Promise<ToolResult> {
  switch (toolName) {
    case "extract_scope": {
      if (ctx.leadId) {
        await db
          .insert(projectScopes)
          .values({
            leadId: ctx.leadId,
            tenantId: ctx.tenantId,
            vertical: (toolInput.vertical as "cabinetry" | "bathroom" | "kitchen" | "landscaping" | "pool" | "outdoor_structures" | "full_renovation") ?? "cabinetry",
            dimensions: toolInput.dimensions as Record<string, number> | undefined,
            materials: toolInput.materials as Record<string, string> | undefined,
            timeline: toolInput.timeline as string | undefined,
            budgetBand: toolInput.budgetBand as string | undefined,
            rawNotes: toolInput.rawNotes as string | undefined,
          })
          .onConflictDoNothing();
      }
      return {
        type: "scope_extracted",
        content: "Project scope captured. I'll use this to personalize your design.",
      };
    }

    case "request_photo": {
      return {
        type: "request_photo",
        content: (toolInput.prompt as string) ?? "Please upload a photo of your current space.",
        data: { showUpload: true },
      };
    }

    case "generate_render": {
      const photoId = (toolInput.photoId as string) ?? ctx.photoId;
      if (!photoId) {
        return {
          type: "error",
          content: "I need a photo of your space first. Can you upload one?",
        };
      }

      // Enforce the tenant's monthly render limit
      const limit = await checkLimit(ctx.tenantId, "renders");
      if (!limit.allowed) {
        return {
          type: "render_limit",
          content:
            "We've hit our design generation limit for this month. Leave your email and we'll send your design as soon as it's available!",
          data: { showEmailForm: true },
        };
      }

      const prompt = buildRenderPrompt({
        vertical: "kitchen",
        styleName: (toolInput.styleId as string) ?? "Modern Shaker",
        primaryChange: (toolInput.primaryChange as string) ?? "redesign in modern style",
      });

      const [render] = await db
        .insert(renders)
        .values({
          tenantId: ctx.tenantId,
          photoId,
          leadId: ctx.leadId ?? null,
          status: "queued",
          promptJson: { prompt, negativePrompt: NEGATIVE_PROMPT },
        })
        .returning();

      await incrementUsage(ctx.tenantId, "rendersUsed");

      // Fire-and-forget the Inngest event
      try {
        const { inngest } = await import("@/inngest/client");
        await inngest.send({
          name: "render/requested",
          data: { renderId: render.id, tenantId: ctx.tenantId, photoId },
        });
      } catch {
        // Inngest not available in dev — render stays queued
      }

      return {
        type: "render_queued",
        content: "Your AI design is generating now — usually takes about 45 seconds.",
        data: { renderId: render.id },
      };
    }

    case "request_email": {
      return {
        type: "request_email",
        content: (toolInput.reason as string) ??
          "To save your design and get a free quote, what's your email?",
        data: { showEmailForm: true },
      };
    }

    case "book_consultation": {
      return {
        type: "book_consultation",
        content: "I'd love to book you in for a free 15-minute design call.",
        data: { showCalendar: true, durationMin: toolInput.durationMin ?? 15 },
      };
    }

    case "handoff_to_human": {
      return {
        type: "handoff",
        content: "I'm connecting you with our team now. Someone will be in touch shortly.",
        data: { reason: toolInput.reason, urgency: toolInput.urgency },
      };
    }

    default: {
      return { type: "error", content: "Unknown tool." };
    }
  }
}

export async function POST(req: Request) {
  // 20 messages per minute per IP — protects Anthropic API costs
  const rl = rateLimit(`chat:${ipFromRequest(req)}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { tenantSlug, messages, photoId, leadId } = parsed.data;

  // Load tenant + brandkit
  const [row] = await db
    .select({ tenant: tenants, brandkit: brandkits })
    .from(tenants)
    .leftJoin(brandkits, eq(brandkits.tenantId, tenants.id))
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!row?.tenant) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
  }

  // Retrieve relevant business knowledge (RAG) based on the latest user turn
  let knowledgeBlock = "";
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMessage) {
    try {
      const chunks = await retrieveKnowledge(row.tenant.id, lastUserMessage.content);
      knowledgeBlock = formatKnowledgeForPrompt(chunks);
    } catch (err) {
      console.error("[chat] knowledge retrieval failed", err);
    }
  }

  const systemPrompt = buildConsultantSystemPrompt(row.tenant, row.brandkit, knowledgeBlock);

  // Sliding window: keep only the most recent turns so long chats stay fast and
  // cheap. The system prompt + RAG carry the durable context. Must start on a
  // user turn (Anthropic requirement).
  const WINDOW = 16;
  let windowed = messages.slice(-WINDOW);
  while (windowed.length && windowed[0].role !== "user") {
    windowed = windowed.slice(1);
  }

  const anthropicMessages: Anthropic.MessageParam[] = windowed.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Agentic loop — up to 5 rounds to handle chained tool calls
  let currentMessages = [...anthropicMessages];
  const uiEvents: ToolResult[] = [];

  for (let round = 0; round < 5; round++) {
    let client: Anthropic;
    try {
      client = anthropic();
    } catch {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const response = await client.messages.create({
      model: MODELS.primary,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cache_control: { type: "ephemeral" } as any,
        },
      ],
      messages: currentMessages,
      tools: consultantTools,
    });

    // Collect text content for the assistant reply
    const textBlocks = response.content.flatMap((b) =>
      b.type === "text" ? [b.text] : [],
    );
    const assistantText = textBlocks.join("\n").trim();

    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
      return NextResponse.json({
        reply: assistantText,
        uiEvents,
      });
    }

    if (response.stop_reason !== "tool_use") {
      return NextResponse.json({ reply: assistantText, uiEvents });
    }

    // Process tool calls
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tool of toolUseBlocks) {
      const result = await handleToolCall(
        tool.name as ToolName,
        tool.input as Record<string, unknown>,
        { tenantId: row.tenant.id, leadId, photoId },
      );
      uiEvents.push(result);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tool.id,
        content: result.content,
      });
    }

    // Push assistant + tool result turns into message history
    currentMessages = [
      ...currentMessages,
      { role: "assistant" as const, content: response.content },
      { role: "user" as const, content: toolResults },
    ];
  }

  return NextResponse.json({
    reply: "I'm processing your request — please give me a moment.",
    uiEvents,
  });
}
