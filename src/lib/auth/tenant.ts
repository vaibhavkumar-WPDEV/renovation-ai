import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { tenants, users } from "@/db/schema";

/**
 * Resolve the active tenant for the current Clerk session.
 * Throws if the user is not signed in or not yet linked to a tenant.
 */
export async function requireTenant() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const row = await db
    .select({ user: users, tenant: tenants })
    .from(users)
    .innerJoin(tenants, eq(users.tenantId, tenants.id))
    .where(eq(users.clerkId, userId))
    .limit(1);

  const first = row[0];
  if (!first) {
    throw new Error("User is not provisioned to any tenant — run onboarding");
  }
  return first;
}

export async function getOrCreateUserFromClerk() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1);
  return existing[0] ?? null;
}
