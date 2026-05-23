import type { Lead, ProjectScope, Tenant } from "@/db/schema";

/**
 * Canonical CRM adapter interface.
 * Each provider (GHL, HubSpot, Jobber, Pipedrive) implements this.
 */
export interface CRMAdapter {
  readonly provider: string;

  pushContact(tenant: Tenant, lead: Lead): Promise<ExternalId>;
  pushDeal(tenant: Tenant, scope: ProjectScope, lead: Lead): Promise<ExternalId>;
  pushNote(tenant: Tenant, externalContactId: string, note: string): Promise<void>;
  pushStageChange(
    tenant: Tenant,
    externalId: string,
    stage: string,
  ): Promise<void>;
  handleWebhook(payload: unknown): Promise<NormalizedEvent[]>;
  defaultFieldMap(): FieldMap;
}

export type ExternalId = string;

export type FieldMap = Record<string, string>;

export interface NormalizedEvent {
  externalId: string;
  entity: "contact" | "deal" | "note" | "stage";
  action: "created" | "updated" | "deleted";
  data: Record<string, unknown>;
}

export class CRMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status?: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = "CRMError";
  }
}
