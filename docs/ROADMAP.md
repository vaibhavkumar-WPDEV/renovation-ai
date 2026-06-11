# RenovateAI — Week-by-Week Roadmap

_Companion to `docs/PROJECT_STATUS.md`. Weeks 1–10.6 are shipped. Weeks 11+ are
the path to "advanced level" — pick up here in future sessions._

## Shipped (Weeks 1–10.6)

| Week | Theme | Key deliverables |
|------|-------|-------------------|
| 1 | Foundation | Multi-tenant schema, Clerk auth, onboarding wizard, repo scaffold |
| 2 | Visualization MVP | Embed widget, photo upload, FLUX render pipeline (full-image inpaint), BrandKit |
| 3 | Sales surface | AI chat (Claude + tools), real dashboard stats, embed snippet |
| 4 | Monetization + lifecycle | Stripe billing, tenant provisioning API, follow-up email sequence |
| 5 | Hardening pass #1 | Rate limiting, validation, error boundaries, admin panel, theming |
| 6 | Plans + CRM | Usage metering, plan limits, GoHighLevel sync |
| 6.5 | Intelligence + growth | RAG knowledge base (pgvector), AI SEO landing pages |
| 7 | CRM polish + retention | GHL OAuth connect, trial reminders, chat trimming, usage banner |
| 8 | Quoting | AI Scope Analyzer, AI Budget Estimator |
| 9 | Closing | AI Proposal Generator, e-signature, Stripe deposit |
| 10 | Reputation | AI Review & Testimonial Assistant |
| 10.5 | Hardening pass #2 | Audit logging, email XSS fix, public API rate limits |
| 10.6 | Hardening pass #3 | Public API key auth + tenant-scoped render lookups |

---

## Up next (Weeks 11–13) — finish the original 90-day plan

### Week 11 — Multi-CRM hub
- HubSpot adapter (`CRMAdapter` interface, same shape as the GHL adapter)
- Jobber adapter (GraphQL)
- Field-mapping UI per integration in Settings → Integrations
- `sync_events` dead-letter queue view in admin panel

### Week 12 — Lead intelligence
- AI Lead Scoring (Haiku, structured output 0–100) → `leads.score`
- Hot/Warm/Cold routing: hot leads SMS the contractor immediately
- Lead-scoring feedback loop (thumbs up/down on score accuracy)

### Week 13 — Launch polish
- `sitemap.xml` + `robots.txt` generation for SEO pages
- Playwright smoke test covering the full funnel (upload → render → lead → proposal → review)
- Public launch checklist: ProductHunt, NKBA outreach, demo video

---

## Advanced level (Months 4–9) — from the original blueprint

### Month 4 — SAM2 region-select rendering
- Segment-anything region picker: homeowner taps "just the cabinets"
- ControlNet depth/edge conditioning for structure preservation
- This is the single biggest "wow" upgrade to the render product

### Month 5 — Voice + speed-to-lead
- Vapi/Bland AI voice agent calls new leads within 5 minutes
- SMS follow-up channel (Twilio) alongside email

### Month 6 — Agency / white-label tier
- Sub-account management (1 agency → 10+ contractor accounts)
- White-label theming (custom domain, logo, email sender)
- GHL Snapshot Marketplace listing

### Month 7 — Vertical expansion #1: bathroom remodeling
- New `vertical_config` entry, curated style references, prompt templates

### Month 8 — Custom LoRA + ROI dashboard
- Per-tenant style LoRA training pipeline (lock-in + upsell)
- "RenovateAI made you $X this quarter" dashboard — the #1 anti-churn feature

### Month 9 — Vertical expansion #2: landscaping
- Same pattern as bathroom — config + style references + 2 weeks of tuning

---

## How to use this file

When you pick up work in a new session:
1. Read `docs/PROJECT_STATUS.md` for current state + security posture
2. Read this file to find the next unchecked week
3. After shipping, move the week from "Up next" to "Shipped" in this file and
   add a row to the feature table in `PROJECT_STATUS.md`
