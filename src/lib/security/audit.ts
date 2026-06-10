import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { ipFromRequest } from "./rateLimit";

/**
 * Tamper-evident audit trail for every consequential action.
 *
 * Best-effort by design: an audit failure must never break the business
 * action itself, so errors are logged and swallowed. For legally sensitive
 * events (e-signatures, payments) pass `req` so IP + user agent are captured
 * alongside the before/after snapshots.
 */
export async function audit(opts: {
  tenantId?: string | null;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  req?: Request;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      tenantId: opts.tenantId ?? null,
      actorId: opts.actorId ?? null,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId ?? null,
      before: opts.before ?? null,
      after: opts.after ?? null,
      ip: opts.req ? ipFromRequest(opts.req) : null,
      userAgent: opts.req ? opts.req.headers.get("user-agent")?.slice(0, 500) ?? null : null,
    });
  } catch (err) {
    console.error(`[audit] failed to record ${opts.action}:`, err);
  }
}
