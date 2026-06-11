/**
 * Public API key auth for /api/v1/* (partner / Zapier integrations).
 *
 * Keys are generated as `rk_live_<32 random hex chars>`, shown to the
 * tenant once, and stored only as a SHA-256 hash — same model as
 * Stripe/GitHub tokens. The first 8 chars after the prefix are kept in
 * `keyPrefix` so the dashboard can show "rk_live_a1b2c3d4…" for identification.
 */
import { randomBytes, createHash } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { apiKeys, tenants } from "@/db/schema";

const KEY_PREFIX = "rk_live_";

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("hex");
  const key = `${KEY_PREFIX}${secret}`;
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Resolve the tenant for a Bearer API key on a public v1 request.
 * Returns null if the header is missing, malformed, unknown, or revoked.
 */
export async function tenantFromApiKey(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const key = match[1].trim();
  if (!key.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(key);
  const [row] = await db
    .select({ apiKey: apiKeys, tenant: tenants })
    .from(apiKeys)
    .innerJoin(tenants, eq(apiKeys.tenantId, tenants.id))
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!row) return null;

  // Best-effort, non-blocking last-used timestamp
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.apiKey.id))
    .catch(() => {});

  return row.tenant;
}
