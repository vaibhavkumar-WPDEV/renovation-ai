import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { brandkits } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { eq } from "drizzle-orm";

const schema = z.object({
  name: z.string().max(128).optional(),
  license: z.string().max(64).optional(),
  bio: z.string().max(2000).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  voiceTone: z.string().max(64).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { tenant } = await requireTenant();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name: _name, license, bio, primaryColor, accentColor, voiceTone, logoUrl } =
      parsed.data;

    await db
      .insert(brandkits)
      .values({
        tenantId: tenant.id,
        licenseNumber: license,
        contractorBio: bio,
        primaryColor: primaryColor ?? "#0F172A",
        accentColor: accentColor ?? "#F59E0B",
        voice: voiceTone ? { tone: voiceTone, examples: [], forbiddenPhrases: [] } : undefined,
        logoUrl: logoUrl ?? undefined,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: brandkits.tenantId,
        set: {
          ...(license !== undefined && { licenseNumber: license }),
          ...(bio !== undefined && { contractorBio: bio }),
          ...(primaryColor !== undefined && { primaryColor }),
          ...(accentColor !== undefined && { accentColor }),
          ...(voiceTone !== undefined && {
            voice: { tone: voiceTone, examples: [], forbiddenPhrases: [] },
          }),
          ...(logoUrl !== undefined && { logoUrl }),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[brandkit/upsert]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
