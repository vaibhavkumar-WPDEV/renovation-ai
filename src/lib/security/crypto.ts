/**
 * Symmetric encryption for at-rest CRM credentials (per-tenant OAuth tokens, etc).
 * Uses AES-256-GCM with a single application-level key (ENCRYPTION_KEY).
 *
 * In production, consider migrating to per-tenant keys via AWS KMS / GCP KMS.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  if (!env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY not set");
  }
  const key = Buffer.from(env.ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte base64 value");
  }
  return key;
}

export interface CRMCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  [key: string]: unknown;
}

export function encryptCredentials(plain: CRMCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(plain), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, data]).toString("base64");
}

export async function decryptCredentials(
  encoded: string,
): Promise<CRMCredentials> {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
  return JSON.parse(plain) as CRMCredentials;
}
