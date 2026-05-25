import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";

/**
 * Clerk webhook — provisions tenant + user on user.created.
 * Verify with Svix signature using CLERK_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = env.CLERK_WEBHOOK_SECRET;

  if (secret) {
    const { Webhook } = await import("svix");
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
    }

    const body = await req.text();
    try {
      const wh = new Webhook(secret);
      wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body) as {
      type: string;
      data: { id: string; email_addresses: Array<{ email_address: string }>; first_name?: string; last_name?: string };
    };
    await handleClerkEvent(payload.type, payload.data);
  } else {
    // Dev mode — no verification
    const payload = await req.json() as {
      type: string;
      data: { id: string; email_addresses: Array<{ email_address: string }>; first_name?: string; last_name?: string };
    };
    await handleClerkEvent(payload.type, payload.data);
  }

  return NextResponse.json({ received: true });
}

async function handleClerkEvent(
  type: string,
  data: { id: string; email_addresses: Array<{ email_address: string }>; first_name?: string; last_name?: string },
) {
  if (type !== "user.created") return;

  const clerkId = data.id;
  const email = data.email_addresses[0]?.email_address ?? "";
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

  // Idempotent — skip if already provisioned
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (existing.length > 0) return;

  // Create tenant slug from email prefix
  const slug = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48) + "-" + Math.random().toString(36).slice(2, 6);

  const [tenant] = await db
    .insert(tenants)
    .values({
      slug,
      name: fullName ?? email.split("@")[0],
      plan: "starter",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
    })
    .returning();

  await db.insert(users).values({
    tenantId: tenant.id,
    clerkId,
    email,
    fullName,
    role: "owner",
  });
}
