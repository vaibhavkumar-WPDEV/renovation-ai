/**
 * GoHighLevel adapter (priority CRM per Phase 4 of the plan).
 *
 * Uses the LeadConnector API v2 (https://services.leadconnectorhq.com).
 * Auth is a per-tenant OAuth access token stored encrypted in `integrations`.
 * The location ID (and optional pipeline IDs) are stored alongside the token
 * in the same encrypted credentials blob.
 */
import {
  CRMError,
  type CRMAdapter,
  type ExternalId,
  type FieldMap,
  type NormalizedEvent,
} from "./types";
import type { Lead, ProjectScope, Tenant } from "@/db/schema";

const API_BASE = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

interface GHLConfig {
  locationId?: string;
  pipelineId?: string;
  pipelineStageId?: string;
}

// Maps our internal lead stages to GHL opportunity statuses
function mapStageToStatus(stage: string): "open" | "won" | "lost" | "abandoned" {
  switch (stage) {
    case "won":
      return "won";
    case "lost":
      return "lost";
    case "nurture":
      return "abandoned";
    default:
      return "open";
  }
}

export class GoHighLevelAdapter implements CRMAdapter {
  readonly provider = "gohighlevel";

  constructor(
    private readonly accessToken: string,
    private readonly config: GHLConfig = {},
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Version: API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new CRMError(
        `GHL ${method} ${path} failed: ${res.status}`,
        this.provider,
        res.status,
        text,
      );
    }

    return (await res.json().catch(() => ({}))) as T;
  }

  async pushContact(_tenant: Tenant, lead: Lead): Promise<ExternalId> {
    if (!this.config.locationId) {
      throw new CRMError("GHL locationId not configured", this.provider);
    }

    const [firstName, ...rest] = (lead.fullName ?? "").trim().split(" ");
    const payload: Record<string, unknown> = {
      locationId: this.config.locationId,
      firstName: firstName || undefined,
      lastName: rest.length ? rest.join(" ") : undefined,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      source: lead.source ?? "RenovateAI",
      tags: ["renovateai", lead.temperature ?? "cold", `score-${lead.score ?? 0}`],
      customFields: [
        { key: "renovateai_lead_id", field_value: lead.id },
      ],
    };

    const data = await this.request<{ contact?: { id: string } }>(
      "POST",
      "/contacts/",
      payload,
    );
    const id = data.contact?.id;
    if (!id) {
      throw new CRMError("GHL pushContact: no contact id returned", this.provider);
    }
    return id;
  }

  async pushDeal(
    _tenant: Tenant,
    scope: ProjectScope,
    lead: Lead,
  ): Promise<ExternalId> {
    if (!this.config.locationId) {
      throw new CRMError("GHL locationId not configured", this.provider);
    }
    if (!this.config.pipelineId || !this.config.pipelineStageId) {
      throw new CRMError(
        "GHL pipelineId/pipelineStageId not configured — set them during integration setup",
        this.provider,
      );
    }

    const externalContactId = lead.externalIds?.gohighlevel;
    const name = `${lead.fullName ?? lead.email ?? "Lead"} — ${scope.vertical} project`;

    const data = await this.request<{ opportunity?: { id: string } }>(
      "POST",
      "/opportunities/",
      {
        pipelineId: this.config.pipelineId,
        pipelineStageId: this.config.pipelineStageId,
        locationId: this.config.locationId,
        contactId: externalContactId,
        name,
        status: "open",
      },
    );
    const id = data.opportunity?.id;
    if (!id) {
      throw new CRMError("GHL pushDeal: no opportunity id returned", this.provider);
    }
    return id;
  }

  async pushNote(
    _tenant: Tenant,
    externalContactId: string,
    note: string,
  ): Promise<void> {
    await this.request("POST", `/contacts/${externalContactId}/notes`, {
      body: note,
    });
  }

  async pushStageChange(
    _tenant: Tenant,
    externalId: string,
    stage: string,
  ): Promise<void> {
    // externalId is the GHL opportunity id
    await this.request("PUT", `/opportunities/${externalId}/status`, {
      status: mapStageToStatus(stage),
    });
  }

  async handleWebhook(payload: unknown): Promise<NormalizedEvent[]> {
    if (!payload || typeof payload !== "object") return [];
    const p = payload as Record<string, unknown>;
    const type = String(p.type ?? "");
    const id = String(p.id ?? "");
    if (!id) return [];

    const map: Record<string, NormalizedEvent> = {
      ContactCreate: { externalId: id, entity: "contact", action: "created", data: p },
      ContactUpdate: { externalId: id, entity: "contact", action: "updated", data: p },
      ContactDelete: { externalId: id, entity: "contact", action: "deleted", data: p },
      OpportunityCreate: { externalId: id, entity: "deal", action: "created", data: p },
      OpportunityStatusUpdate: { externalId: id, entity: "stage", action: "updated", data: p },
      OpportunityUpdate: { externalId: id, entity: "deal", action: "updated", data: p },
    };

    const event = map[type];
    return event ? [event] : [];
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
