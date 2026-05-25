import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

const schema = z.object({
  businessName: z.string().min(2).max(128),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  primaryVertical: z.enum([
    "cabinetry",
    "bathroom",
    "kitchen",
    "landscaping",
    "pool",
    "outdoor_structures",
    "full_renovation",
  ]),
  countryCode: z.string().length(2).default("US"),
  timezone: z.string().default("UTC"),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if already provisioned
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Already provisioned", tenantSlug: existing[0].tenantId }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Ensure slug is unique
  const slugConflict = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, parsed.data.slug))
    .limit(1);
  if (slugConflict.length > 0) {
    return NextResponse.json({ error: "That URL is already taken — try a different one." }, { status: 409 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  const [tenant] = await db
    .insert(tenants)
    .values({
      slug: parsed.data.slug,
      name: parsed.data.businessName,
      primaryVertical: parsed.data.primaryVertical,
      countryCode: parsed.data.countryCode,
      plan: "starter",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })
    .returning();

  await db.insert(users).values({
    tenantId: tenant.id,
    clerkId: userId,
    email,
    fullName,
    role: "owner",
  });

  return NextResponse.json({ ok: true, tenantSlug: tenant.slug }, { status: 201 });
}
