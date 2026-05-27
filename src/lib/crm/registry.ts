import { GoHighLevelAdapter } from "./gohighlevel";
import type { CRMAdapter } from "./types";
import type { Integration } from "@/db/schema";
import { decryptCredentials } from "@/lib/security/crypto";

/**
 * Resolve a CRM adapter for a given integration row.
 * Credentials are decrypted on demand; never stored in memory longer than needed.
 */
export async function getAdapter(integration: Integration): Promise<CRMAdapter> {
  const creds = await decryptCredentials(integration.credentialsEncrypted);
  switch (integration.provider) {
    case "gohighlevel":
      return new GoHighLevelAdapter(creds.accessToken, {
        locationId: creds.locationId as string | undefined,
        pipelineId: creds.pipelineId as string | undefined,
        pipelineStageId: creds.pipelineStageId as string | undefined,
      });
    case "hubspot":
      throw new Error("HubSpot adapter not yet implemented (Week 13)");
    case "jobber":
      throw new Error("Jobber adapter not yet implemented (Week 13)");
    case "pipedrive":
      throw new Error("Pipedrive adapter not yet implemented (Week 13)");
    case "webhook":
      throw new Error("Generic webhook adapter not yet implemented");
    default: {
      const _exhaustive: never = integration.provider;
      throw new Error(`Unknown CRM provider: ${_exhaustive}`);
    }
  }
}
