import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { integrations } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { encryptCredentials } from "@/lib/security/crypto";
import { env } from "@/lib/env";

const TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";

interface GHLTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  locationId?: string;
}

/**
 * GoHighLevel OAuth callback. Exchanges the auth code for tokens and stores
 * them encrypted in the tenant's `integrations` row.
 */
export async function GET(req: Request) {
  const dashboardUrl = new URL("/dashboard/integrations", env.NEXT_PUBLIC_APP_URL);

  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.redirect(new URL("/sign-in", env.NEXT_PUBLIC_APP_URL));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    dashboardUrl.searchParams.set("ghl", "error");
    return NextResponse.redirect(dashboardUrl);
  }

  if (!env.GHL_OAUTH_CLIENT_ID || !env.GHL_OAUTH_CLIENT_SECRET || !env.ENCRYPTION_KEY) {
    dashboardUrl.searchParams.set("ghl", "misconfigured");
    return NextResponse.redirect(dashboardUrl);
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/integrations/gohighlevel/callback`;

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GHL_OAUTH_CLIENT_ID,
        client_secret: env.GHL_OAUTH_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        user_type: "Location",
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${res.status}`);
    }

    const tokens = (await res.json()) as GHLTokenResponse;

    const encrypted = encryptCredentials({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      scope: tokens.scope,
      locationId: tokens.locationId,
    });

    await db
      .insert(integrations)
      .values({
        tenantId: tenant.id,
        provider: "gohighlevel",
        credentialsEncrypted: encrypted,
        status: "active",
        lastSyncAt: null,
      })
      .onConflictDoUpdate({
        target: [integrations.tenantId, integrations.provider],
        set: { credentialsEncrypted: encrypted, status: "active" },
      });

    dashboardUrl.searchParams.set("ghl", "connected");
    return NextResponse.redirect(dashboardUrl);
  } catch (err) {
    console.error("[ghl-callback]", err);
    dashboardUrl.searchParams.set("ghl", "error");
    return NextResponse.redirect(dashboardUrl);
  }
}
