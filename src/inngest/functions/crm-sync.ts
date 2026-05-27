import { and, eq } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/db/client";
import { integrations, leads, syncEvents, tenants } from "@/db/schema";
import { getAdapter } from "@/lib/crm/registry";

/**
 * On `lead/scored`, push the lead into the tenant's connected CRM (GHL first).
 * No-op if the tenant has no active integration. Each attempt is logged to
 * `sync_events` so failures are visible per tenant.
 *
 * Load + push happen in a single step: Inngest serializes step output to JSON,
 * which would turn the Drizzle rows' Date fields into strings and break the
 * adapter's typed inputs if they crossed a step boundary.
 */
export const syncLeadToCrm = inngest.createFunction(
  {
    id: "sync-lead-to-crm",
    name: "Sync lead to CRM",
    retries: 3,
  },
  { event: "lead/scored" },
  async ({ event, step }) => {
    const { leadId, tenantId } = event.data;

    return step.run("push-lead-to-crm", async () => {
      const [integration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.tenantId, tenantId),
            eq(integrations.status, "active"),
          ),
        )
        .limit(1);
      if (!integration) return { skipped: true, reason: "no active integration" };

      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) return { skipped: true, reason: "lead not found" };

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (!tenant) return { skipped: true, reason: "tenant not found" };

      try {
        const adapter = await getAdapter(integration);
        const externalId = await adapter.pushContact(tenant, lead);

        await db
          .update(leads)
          .set({
            externalIds: { ...(lead.externalIds ?? {}), [integration.provider]: externalId },
          })
          .where(eq(leads.id, leadId));

        await db.insert(syncEvents).values({
          integrationId: integration.id,
          direction: "outbound",
          entity: "contact",
          externalId,
          payload: { leadId, score: lead.score },
          status: "success",
        });

        await db
          .update(integrations)
          .set({ lastSyncAt: new Date() })
          .where(eq(integrations.id, integration.id));

        return { ok: true, externalId };
      } catch (err) {
        await db.insert(syncEvents).values({
          integrationId: integration.id,
          direction: "outbound",
          entity: "contact",
          payload: { leadId },
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    });
  },
);
