import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    if (
      !env.R2_ACCOUNT_ID ||
      !env.R2_ACCESS_KEY_ID ||
      !env.R2_SECRET_ACCESS_KEY
    ) {
      throw new Error("Cloudflare R2 credentials not configured");
    }
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export async function presignUpload(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), cmd, { expiresIn });
}

export async function presignDownload(
  bucket: string,
  key: string,
  expiresIn = 60 * 60 * 24 * 7,
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client(), cmd, { expiresIn });
}

export function publicUrl(key: string): string {
  return env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `r2://${key}`;
}

export function photoKey(tenantId: string, hash: string, ext: string): string {
  return `photos/${tenantId}/${hash}.${ext}`;
}

export function renderKey(tenantId: string, renderId: string): string {
  return `renders/${tenantId}/${renderId}.png`;
}
