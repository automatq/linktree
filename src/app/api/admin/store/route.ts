import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

// Saves email-capture and tip-jar profile fields — never touches links
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { emailCaptureEnabled, emailCaptureTitle, emailCaptureButtonText, tipJarEnabled, tipJarTitle, tipJarAmounts } = await req.json();

  await db.update(profiles)
    .set({
      emailCaptureEnabled: emailCaptureEnabled ?? false,
      emailCaptureTitle: emailCaptureTitle || "Stay in the loop",
      emailCaptureButtonText: emailCaptureButtonText || "Subscribe",
      tipJarEnabled: tipJarEnabled ?? false,
      tipJarTitle: tipJarTitle || "Support my work",
      tipJarAmounts: tipJarAmounts || "3,5,10,25",
    })
    .where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true });
}
