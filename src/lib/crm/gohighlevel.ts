/**
 * GoHighLevel adapter (priority CRM per Phase 4 of the plan).
 *
 * GHL API v2 reference: https://highlevel.stoplight.io/docs/integrations/
 *
 * NOTE: Auth uses per-tenant OAuth tokens stored encrypted in `integrations`.
 * This file is the integration surface. Full implementation lands Week 4 of the MVP.
 */
import {
  CRMError,
  type CRMAdapter,
  type ExternalId,
  type FieldMap,
  type NormalizedEvent,
} from "./types";
import type { Lead, ProjectScope, Tenant } from "@/db/schema";

export class GoHighLevelAdapter implements CRMAdapter {
  readonly provider = "gohighlevel";

  constructor(private readonly accessToken: string) {}

  async pushContact(_tenant: Tenant, lead: Lead): Promise<ExternalId> {
    // TODO Week 4: POST /contacts/ with real fetch
    // Payload shape: { email, phone, firstName, lastName, tags, customFields }
    void lead;
    void this.accessToken;
    throw new CRMError("GHL pushContact not implemented yet", this.provider);
  }

  async pushDeal(
    _tenant: Tenant,
    _scope: ProjectScope,
    _lead: Lead,
  ): Promise<ExternalId> {
    throw new CRMError("GHL pushDeal not implemented yet", this.provider);
  }

  async pushNote(): Promise<void> {
    throw new CRMError("GHL pushNote not implemented yet", this.provider);
  }

  async pushStageChange(): Promise<void> {
    throw new CRMError("GHL pushStageChange not implemented yet", this.provider);
  }

  async handleWebhook(payload: unknown): Promise<NormalizedEvent[]> {
    // GHL sends events for contact updates, opportunity stage changes, etc.
    // We normalize them into our internal event shape.
    void payload;
    return [];
  }

  defaultFieldMap(): FieldMap {
    return {
      email: "email",
      phone: "phone",
      fullName: "firstName+lastName",
      score: "customFields.renovateai_score",
      stage: "tags",
    };
  }
}
