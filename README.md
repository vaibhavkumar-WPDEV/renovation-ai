# RenovateAI

> AI sales & visualization platform for renovation, cabinetry, and landscaping contractors.

A B2B SaaS that gives contractors a white-labeled AI sales engine for their own website: photoreal FLUX-rendered project concepts, 24/7 AI consultations, automated lead qualification & follow-up, and native CRM sync — without commoditizing their brand.

**Status:** Week-1 MVP scaffold. See `/root/.claude/plans/https-havencabinetry-com-au-staging-http-glittery-kahan.md` for the full product blueprint.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| UI primitives | Radix + custom shadcn-style components |
| DB | PostgreSQL + Drizzle ORM (pgvector for embeddings) |
| Auth | Clerk (multi-tenant orgs) |
| Workflows | Inngest |
| Storage | Cloudflare R2 (S3-compatible) |
| LLM | Anthropic Claude Sonnet 4.6 / Haiku 4.5 |
| Image AI | FLUX.2-dev via Fal.ai (primary) + Replicate (fallback) |
| Segmentation | SAM 2 via Replicate |
| Payments | Stripe |
| Email / SMS | Resend / Twilio |

## Repository layout

```
src/
├── app/
│   ├── (marketing)/          # Public landing, pricing
│   ├── (app)/dashboard/      # Contractor admin (auth required)
│   ├── (widget)/embed/       # Homeowner-facing embedded widget
│   └── api/
│       ├── inngest/          # Inngest webhook handler
│       ├── v1/               # Public REST API (leads, renders)
│       └── webhooks/         # Inbound webhooks (Stripe, GHL, etc.)
├── components/
│   ├── ui/                   # Base primitives
│   ├── widget/               # Homeowner-facing widget components
│   ├── dashboard/            # Contractor admin components
│   └── marketing/            # Landing page components
├── db/
│   ├── schema.ts             # Drizzle schema (source of truth)
│   ├── client.ts             # Connection + RLS helpers
│   └── migrations/           # Generated SQL migrations
├── lib/
│   ├── ai/                   # Anthropic client + prompt builders
│   ├── render/               # FLUX + ControlNet + SAM 2 pipeline
│   ├── crm/                  # CRM adapter interface + per-vendor impls
│   ├── storage/              # R2 client + presigned URLs
│   ├── auth/                 # Clerk helpers + tenant resolution
│   └── env.ts                # Typed env validation (Zod)
└── inngest/
    ├── client.ts             # Inngest singleton
    └── functions/            # Workflow definitions
```

## Local development

```bash
# Install
pnpm install

# Configure env
cp .env.example .env.local
# Fill in Anthropic, Clerk, R2, Fal, Postgres credentials

# Database
pnpm db:push          # apply schema to local Postgres
pnpm db:studio        # browse data

# Run
pnpm dev              # Next.js dev server on :3000
```

## MVP roadmap (30 days)

- **Week 1 (this scaffold):** Repo, schema, tenant model, env scaffolding, Clerk auth wiring ✅
- **Week 2:** Embed widget, photo upload, FLUX render pipeline (full-image inpaint)
- **Week 3:** Chat assistant (Claude tool-use), lead capture, lead inbox UI
- **Week 4:** Email follow-up sequences, GHL push integration, first contractor onboarded

See [plan file](../../../root/.claude/plans/https-havencabinetry-com-au-staging-http-glittery-kahan.md) for full 12-month roadmap.

## License

Proprietary. © 2026 RenovateAI.
