# Staging — run & test RenovateAI for $0

_Last verified: 2026-06-11 (all tests run against a real local Postgres 16 + pgvector)._

## 1. Cost model for staging

You pay **nothing** during staging. Every service in the stack has a free tier
that comfortably covers testing:

| Service | Free tier | Enough for staging? |
|---|---|---|
| Neon (Postgres + pgvector) | 0.5 GB storage, autosuspend compute | ✅ Yes — thousands of leads/renders rows |
| Vercel (hosting) | Hobby plan, preview + production deploys | ✅ Yes |
| Clerk (auth) | 10,000 MAU | ✅ Yes |
| Cloudflare R2 (images) | 10 GB storage, zero egress fees | ✅ Yes |
| Resend (email) | 100 emails/day | ✅ Yes |
| Stripe | Free in test mode | ✅ Yes |
| Inngest (background jobs) | Free dev server locally; free tier hosted | ✅ Yes |
| Anthropic / Fal.ai | Pay-per-use only when AI features are exercised | ~$1–5 for a full test pass |

When you go live, database cost is **passed through to plans**: usage metering
(`usage_meters` table) already tracks per-tenant renders/leads/messages, so
plan pricing absorbs infra cost — clients fund the database through their
subscription, you never pay ahead of revenue.

## 2. Local staging (what was verified in this session)

```bash
# 1. Postgres 16 + pgvector, create db + user
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER renovate WITH PASSWORD '...' SUPERUSER;" \
                       -c "CREATE DATABASE renovateai OWNER renovate;"
sudo -u postgres psql -d renovateai -c "CREATE EXTENSION vector;"

# 2. Apply migrations
psql $DATABASE_URL -f src/db/migrations/0000_salty_starbolt.sql
psql $DATABASE_URL -f src/db/migrations/0001_shallow_vivisector.sql

# 3. Env (.env.local): DATABASE_URL, DATABASE_URL_POOLED, Clerk keys,
#    INNGEST_DEV=1, INNGEST_BASE_URL=http://127.0.0.1:8288

# 4. Run
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest   # terminal 1
npm run build && npm run start                                     # terminal 2
```

## 3. Verified test results (2026-06-11)

All run against the production build (`next start`), real Postgres, real HTTP:

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Homepage loads | 200 | ✅ 200 |
| 2 | `POST /api/v1/leads` without API key | 401 | ✅ 401 |
| 3 | `POST /api/v1/leads` with invalid key | 401 | ✅ 401 |
| 4 | `POST /api/v1/leads` with valid `rk_live_` key | 201 + row in DB | ✅ 201, row verified via SQL |
| 5 | Invalid email payload | 400 with field errors | ✅ 400 |
| 6 | `GET /api/v1/renders` without key | 401 | ✅ 401 |
| 7 | `GET /api/v1/renders` unknown id (with key) | 404 | ✅ 404 |
| 8 | Revoked key rejected | 401 | ✅ 401 |
| 9 | Lead capture while job queue is DOWN | 201 (lead never lost) | ✅ 201, row persisted |

Test 9 found and fixed a real bug: the route previously returned 500 (while
still inserting the row) if the Inngest event emit failed. Lead capture is now
best-effort on telemetry; render creation returns 503 + marks the render
`failed` if the queue is unavailable (since there the event IS the job).

## 4. Public staging URL (when you're ready — still $0)

1. **Neon**: create free project → copy both connection strings →
   run the two migration files against it (or `npm run db:push`)
2. **Clerk**: create free app → copy `pk_test_`/`sk_test_` keys
3. **Vercel**: import the GitHub repo → set env vars from `.env.example` →
   deploy → you get `https://renovation-ai-<hash>.vercel.app`
4. **Inngest**: `npx vercel env` add `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`
   from a free Inngest cloud account (or leave follow-ups disabled for staging)
5. Create an API key in Dashboard → Settings → API keys, then re-run the curl
   tests above against the Vercel URL

Total monthly cost in staging: **$0** (plus a few dollars of AI usage only
when you exercise renders/chat).
