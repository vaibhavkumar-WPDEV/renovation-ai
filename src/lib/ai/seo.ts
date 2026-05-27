/**
 * AI SEO page generator.
 *
 * Generates a local service landing page (service × city) with Claude:
 * structured content + JSON-LD schema for local search. Content is produced as
 * structured data, then rendered to HTML deterministically (we never trust the
 * model to emit raw HTML — all text is escaped) to avoid injection.
 */
import { anthropic, MODELS } from "./anthropic";
import type { Tenant, Brandkit } from "@/db/schema";

export interface SeoContent {
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
  ctaText: string;
}

export interface GeneratedSeoPage {
  content: SeoContent;
  html: string;
  schemaJson: {
    jsonLd: Record<string, unknown>;
    meta: { title: string; description: string };
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function slugifySeo(service: string, city: string): string {
  return `${service}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

const SYSTEM_PROMPT = `You are an expert local-SEO copywriter for home renovation contractors. You write landing pages that rank for "[service] [city]" searches and convert homeowners into leads.

Output ONLY valid JSON matching this exact shape (no markdown, no commentary):
{
  "title": "SEO title tag, <60 chars, includes service + city",
  "metaDescription": "compelling meta description, 140-160 chars",
  "h1": "page headline including service + city",
  "intro": "2-3 sentence intro paragraph",
  "sections": [{"heading": "...", "body": "1-2 paragraphs"}],
  "faqs": [{"question": "...", "answer": "..."}],
  "ctaText": "call-to-action button text"
}

Rules:
- 3-4 sections covering: why choose them, the process, materials/quality, local expertise.
- 4-6 FAQs answering real homeowner questions (cost ranges, timeline, permits, warranty).
- Never invent specific prices — use ranges and "every project is custom".
- Natural keyword usage, no stuffing. Write for humans first.`;

export async function generateSeoContent(opts: {
  tenant: Tenant;
  brandkit: Brandkit | null;
  service: string;
  city: string;
}): Promise<SeoContent> {
  const { tenant, brandkit, service, city } = opts;
  const bio = brandkit?.contractorBio ? `About the contractor: ${brandkit.contractorBio}` : "";

  const res = await anthropic().messages.create({
    model: MODELS.primary,
    max_tokens: 2048,
    system: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } as any },
    ],
    messages: [
      {
        role: "user",
        content: `Write a landing page for:
Business: ${tenant.name}
Service: ${service}
City: ${city}
Country: ${tenant.countryCode}
Specialty: ${tenant.primaryVertical}
${bio}`,
      },
    ],
  });

  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  // Strip any accidental code fences
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(jsonText) as SeoContent;
}

export function buildSeoPage(opts: {
  content: SeoContent;
  tenant: Tenant;
  service: string;
  city: string;
  widgetUrl: string;
}): GeneratedSeoPage {
  const { content, tenant, service, city, widgetUrl } = opts;

  const sectionsHtml = content.sections
    .map(
      (s) =>
        `<section><h2>${escapeHtml(s.heading)}</h2><p>${escapeHtml(s.body)}</p></section>`,
    )
    .join("\n");

  const faqsHtml = content.faqs
    .map(
      (f) =>
        `<div class="faq"><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></div>`,
    )
    .join("\n");

  const html = `<article>
  <h1>${escapeHtml(content.h1)}</h1>
  <p class="intro">${escapeHtml(content.intro)}</p>
  ${sectionsHtml}
  <section class="cta">
    <h2>Get your free AI design &amp; quote</h2>
    <iframe src="${escapeHtml(widgetUrl)}" width="100%" height="640" frameborder="0" allow="camera" style="border-radius:16px;border:0" loading="lazy"></iframe>
  </section>
  <section class="faqs">
    <h2>Frequently asked questions</h2>
    ${faqsHtml}
  </section>
</article>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: tenant.name,
        areaServed: city,
        address: { "@type": "PostalAddress", addressLocality: city, addressCountry: tenant.countryCode },
      },
      {
        "@type": "Service",
        name: `${service} in ${city}`,
        provider: { "@type": "LocalBusiness", name: tenant.name },
        areaServed: city,
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  return {
    content,
    html,
    schemaJson: {
      jsonLd,
      meta: { title: content.title, description: content.metaDescription },
    },
  };
}
