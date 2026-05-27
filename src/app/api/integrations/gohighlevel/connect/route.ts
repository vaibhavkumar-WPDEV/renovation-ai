import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/auth/tenant";
import { env } from "@/lib/env";

const GHL_AUTHORIZE_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const SCOPES = [
  "contacts.write",
  "contacts.readonly",
  "opportunities.write",
  "opportunities.readonly",
  "locations.readonly",
].join(" ");

/**
 * Kick off the GoHighLevel OAuth flow.
 * Redirects the contractor to GHL to choose a location and authorize.
 */
export async function GET() {
  try {
    await requireTenant();
  } catch {
    return NextResponse.redirect(new URL("/sign-in", env.NEXT_PUBLIC_APP_URL));
  }

  if (!env.GHL_OAUTH_CLIENT_ID) {
    return NextResponse.json(
      { error: "GoHighLevel OAuth is not configured (missing GHL_OAUTH_CLIENT_ID)." },
      { status: 503 },
    );
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/integrations/gohighlevel/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: redirectUri,
    client_id: env.GHL_OAUTH_CLIENT_ID,
    scope: SCOPES,
  });

  return NextResponse.redirect(`${GHL_AUTHORIZE_URL}?${params.toString()}`);
}
