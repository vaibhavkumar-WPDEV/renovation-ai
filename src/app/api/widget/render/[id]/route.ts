import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { renders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [render] = await db
    .select()
    .from(renders)
    .where(eq(renders.id, id))
    .limit(1);

  if (!render) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let outputUrl: string | null = null;

  if (render.status === "completed" && render.outputR2Key) {
    const key = render.outputR2Key;
    if (key.startsWith("http")) {
      // Fal.ai / Replicate URL stored directly during MVP
      outputUrl = key;
    } else if (env.R2_PUBLIC_URL) {
      outputUrl = `${env.R2_PUBLIC_URL}/${key}`;
    } else {
      // Generate presigned download URL
      try {
        const { presignDownload } = await import("@/lib/storage/r2");
        outputUrl = await presignDownload(env.R2_BUCKET_RENDERS, key);
      } catch {
        outputUrl = null;
      }
    }
  }

  return NextResponse.json({
    status: render.status,
    outputUrl,
    errorMessage: render.errorMessage,
  });
}
