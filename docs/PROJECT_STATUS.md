# RenovateAI — Project Status & Audit Report

_Last updated: 2026-06-11 · Branch: `claude/funny-lamport-MZCwj`_

This file is the persistent "memory" of where the product stands: what's built,
what's tested, what's secure, what's left, and how to grow revenue. Update it
whenever a milestone lands so future sessions (and humans) don't have to
re-derive context.

---

## 1. Feature completion table

| # | Feature | Plain-English description | Status | Week |
|---|---------|---------------------------|--------|------|
| 1 | Multi-tenant foundation | Each contractor gets an isolated workspace; data never crosses tenants | ✅ Done | 1 |
| 2 | Auth (Clerk) | Sign up / sign in, session management | ✅ Done | 1 |
| 3 | Onboarding wizard | New contractor picks a slug → workspace auto-provisioned | ✅ Done | 1 |
| 4 | BrandKit | Logo, colors, brand voice, bio, license/insurance — widget reflects contractor's brand | ✅ Done | 2 |
| 5 | Homeowner widget | Embeddable page where homeowners upload photos & chat | ✅ Done | 2 |
| 6 | AI photo renders (FLUX/Fal.ai) | Upload kitchen photo → AI shows renovated version in ~60s | ✅ Done | 2 |
| 7 | AI chat assistant (Claude) | 24/7 assistant answering using contractor's own info | ✅ Done | 3 |
| 8 | Real dashboard stats | Live lead/render counts on the dashboard home | ✅ Done | 3 |
| 9 | Embed snippet generator | Copy-paste iframe code for the contractor's site | ✅ Done | 3 |
| 10 | Tenant provisioning API | Automated workspace creation on signup | ✅ Done | 4 |
| 11 | Stripe billing | Checkout, customer portal, plan upgrades via webhook | ✅ Done | 4 |
| 12 | Follow-up emails (Resend + Inngest) | Automatic reminder emails to leads who go quiet | ✅ Done | 4 |
| 13 | Security hardening pass #1 | Rate limiting, input validation, error boundaries, admin panel, dark/light mode | ✅ Done | 5 |
| 14 | Plan limits + usage metering | Starter/Growth/Pro render & lead caps enforced server-side | ✅ Done | 6 |
| 15 | GoHighLevel CRM sync | Leads pushed to the contractor's GHL pipeline | ✅ Done | 6 |
| 16 | AI memory / RAG (pgvector) | Contractor uploads docs/FAQs; chatbot retrieves relevant chunks | ✅ Done | 6.5 |
| 17 | SEO module | AI-generated local landing pages with JSON-LD schema | ✅ Done | 6.5 |
| 18 | GHL OAuth connect flow | One-click CRM connection (no manual API keys) | ✅ Done | 7 |
| 19 | Trial reminder emails | "Your trial ends in N days" automated emails | ✅ Done | 7 |
| 20 | Chat history trimming + usage banner | Keeps token costs bounded; shows usage in dashboard | ✅ Done | 7 |
| 21 | AI Scope Analyzer | Turns a chat into a structured project spec (dimensions, materials, timeline) | ✅ Done | 8 |
| 22 | AI Budget Estimator | Price range using the contractor's own pricing rules | ✅ Done | 8 |
| 23 | AI Proposal Generator | One-click web proposal, e-signature, Stripe deposit | ✅ Done | 9 |
| 24 | Review & Testimonial Assistant | 4–5★ → public review links; 1–3★ → private alert + AI-drafted reply | ✅ Done | 10 |
| 25 | **Tamper-evident audit log** | Every signature, payment, settings change, integration change is logged with IP/actor/before-after | ✅ Done | 10.5 |
| 26 | **Email XSS hardening** | User-controlled text (names, feedback, AI drafts) escaped before going into HTML emails | ✅ Done | 10.5 |
| 27 | **Public API rate limiting** | `/api/v1/leads` and `/api/v1/renders` capped per-IP | ✅ Done | 10.5 |
| 28 | **Public API key auth** | `/api/v1/*` now requires a per-tenant `Authorization: Bearer rk_live_...` key, managed from Settings | ✅ Done | 10.6 |
| 29 | **Render lookup tenant scoping** | `GET /api/v1/renders?id=` now requires the owning tenant's API key | ✅ Done | 10.6 |

**29 of 29 currently-scoped features complete.** Everything compiles (`tsc --noEmit`), lints clean (`eslint`), and builds (`next build`) as of this commit.

---

## 2. How to test (step by step)

### 2.1 Services you need (all have free tiers)

| Service | Purpose | Env var(s) |
|---|---|---|
| Postgres (Neon/Supabase, with pgvector) | Primary database | `DATABASE_URL`, `DATABASE_URL_POOLED` |
| Clerk | Authentication | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| Anthropic | Chat, scope analysis, review drafts, SEO copy | `ANTHROPIC_API_KEY` |
| Fal.ai | AI photo renders (FLUX) | `FAL_KEY` |
| Cloudflare R2 (S3-compatible) | Photo & render storage | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ACCOUNT_ID` |
| Resend | Transactional email | `RESEND_API_KEY` |
| Stripe | Billing + deposits | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Inngest | Background jobs (renders, follow-ups, sync) | works in dev with `npx inngest-cli dev`, no key needed locally |
| GoHighLevel (optional) | CRM sync | `GHL_OAUTH_CLIENT_ID`, `GHL_OAUTH_CLIENT_SECRET` |
| Encryption | At-rest CRM credential encryption | `ENCRYPTION_KEY` (32-byte base64) |

### 2.2 Local setup

```bash
cp .env.example .env        # fill in the keys above
npm install
npm run db:push              # creates/updates all tables (incl. new api_keys table)
npm run dev                  # in one terminal
npx inngest-cli dev          # in another terminal — background jobs
```

### 2.3 End-to-end funnel test

1. Sign up → complete onboarding → workspace + tenant created
2. Dashboard → Settings → BrandKit → upload logo, set colors, voice
3. Open `/embed/<your-slug>` in an incognito tab (this is what homeowners see)
4. Upload a kitchen photo → pick a style → request a render → wait for the FLUX job (Inngest dashboard shows progress)
5. Chat with the AI assistant — ask about pricing, timeline; it should use your BrandKit voice + any uploaded knowledge docs
6. Leave an email → a `lead` row appears in **Dashboard → Leads**
7. Wait (or manually trigger) the follow-up email — check Resend logs / inbox
8. Dashboard → Leads → open a lead → **Generate Scope** → **Compute Estimate** → **Create Proposal** → **Send**
9. Open the proposal link (`/p/[token]`) → sign it → pay the test-mode Stripe deposit
10. Dashboard → mark project complete → review request sent → open `/r/[token]` → submit a 5★ (public) and a 2★ (private, triggers owner alert email) review
11. **New this session:** Dashboard → Settings → API keys → create a key → call:
    ```bash
    curl -X POST https://your-app/api/v1/leads \
      -H "Authorization: Bearer rk_live_..." \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","fullName":"Test Lead","source":"zapier"}'
    ```
    Should return `201` with a lead id. Without the header it now returns `401`.

### 2.4 Automated checks (run before every push)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # next build (full production compile)
```

All three currently pass with zero errors/warnings.

---

## 3. Architecture summary

- **One Next.js 16 app** (App Router, React 19, TypeScript strict) — frontend + backend together
- **Frontend surfaces:**
  - `/dashboard/*` — contractor admin (leads, renders, proposals, reviews, SEO, settings, admin)
  - `/embed/[tenantSlug]` — homeowner-facing widget (white-labeled)
  - `/p/[token]`, `/r/[token]`, `/s/[tenantSlug]/[slug]` — public proposal, review, and SEO pages
- **Backend:** ~32 API routes under `/api/*`, Drizzle ORM over Postgres + pgvector, Inngest for async jobs (renders, follow-ups, CRM sync), Stripe/Clerk webhooks
- **Deploy target:** Vercel (app) + Neon (DB) + Cloudflare R2 (images)

---

## 4. Security posture

**Implemented:**
- Clerk auth on every dashboard/API route via `requireTenant()`
- All tenant queries scoped by `tenantId` — no cross-tenant data leakage
- Zod validation on every API input
- Stripe webhook signature verification (`stripe.webhooks.constructEvent`)
- CRM OAuth tokens encrypted at rest (AES-256-GCM, `ENCRYPTION_KEY`)
- Photo EXIF stripped on upload (privacy)
- Per-IP rate limiting on every public endpoint (widget chat/upload, leads, renders, reviews, proposal sign)
- Unguessable, single-use access tokens for proposals & review links
- AI-generated SEO HTML is built from structured JSON with `escapeHtml()` on every field — never raw model output
- **Tamper-evident audit log** (`audit_log` table) on: `proposal.signed`, `proposal.sent`, `proposal.deposit_paid`, `subscription.created/updated/deleted`, `settings.pricing.updated`, `settings.reviews.updated`, `review.submitted`, `integration.connected/disconnected`, `api_key.created/revoked`
- Email templates escape all user-controlled text (names, feedback, AI drafts) — no stored XSS via email clients
- **Public API (`/api/v1/*`) requires a per-tenant API key** (`Authorization: Bearer rk_live_...`), hashed (SHA-256) at rest, manageable/revocable from Settings
- `GET /api/v1/renders?id=` is now tenant-scoped via the API key — can't be used to enumerate other tenants' renders

**Recommended next hardening pass (not yet done):**
- Migrate in-process rate limiter to Upstash Redis before multi-region deploy (current implementation is single-instance)
- Add SOC2-style structured logging export (Axiom/BetterStack) for the audit log
- Add CSP headers + `Content-Security-Policy` on the embed widget
- Penetration test before the Agency/white-label tier launches

**Honest framing:** "100% unhackable" doesn't exist for any product. What you have now is a strong, defensible baseline — tenant isolation, signed webhooks, encrypted credentials, audited mutations, rate-limited and authenticated public endpoints. The remaining items are operational maturity (logging infra, pen test) rather than open holes.

---

## 5. Performance / SEO / AIO assessment

- **Speed:** Server components by default, minimal client JS, async render queue (UI never blocks on FLUX). Production build compiles cleanly. **8/10** — next gains come from R2/CDN image transforms and ISR tuning on SEO pages.
- **SEO:** Each generated page ships `LocalBusiness` + `Service` + `FAQPage` JSON-LD, semantic HTML, per-city targeting. **8.5/10** — add `sitemap.xml`/`robots.txt` generation (small, see Roadmap §6.1) and start building backlinks (marketing, not code).
- **AIO (AI search engines — ChatGPT/Perplexity/Gemini):** Structured FAQ + schema content is exactly what AI answer engines cite. Foundation is solid; volume of indexed pages drives results over time.
- A "10/10 ranking" is earned through months of content + links; the technical groundwork is in place and is not the bottleneck.

---

## 6. Monetization — concrete levers

1. **Tiered metering** (already enforced): Starter/Growth/Pro/Agency caps on renders & leads
2. **Annual plans** at 2-months-free — improves cash flow and reduces churn
3. **One-time setup fee** ($497–$997) for white-glove onboarding
4. **Add-ons:** SEO page packs, custom LoRA training + maintenance, AI voice agent
5. **Agency/white-label tier** — one sale = 10+ contractor sub-accounts
6. **Referral program** (30% rev-share) — contractors refer contractors
7. **API access as a paid add-on** — now that `/api/v1/*` has real auth, this can be a Pro+/Agency perk (e.g., "Zapier integration" as an upsell)

---

## 7. Cross-references

- Full original product blueprint (market analysis, all 10 AI modules, tech stack rationale, 12-month roadmap): `/root/.claude/plans/https-havencabinetry-com-au-staging-http-glittery-kahan.md`
- Week-by-week plan and what's next: `docs/ROADMAP.md`
