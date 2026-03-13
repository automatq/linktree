import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhookUrl } = await req.json();
  const trimmed = webhookUrl?.trim() || "";

  // Validate URL format if provided
  if (trimmed) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") {
        return NextResponse.json({ error: "Webhook URL must use HTTPS" }, { status: 400 });
      }
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "169.254.169.254" || host.endsWith(".local") || host.endsWith(".internal")) {
        return NextResponse.json({ error: "Webhook URL must be a public endpoint" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }

  await db
    .update(profiles)
    .set({ webhookUrl: trimmed })
    .where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true });
}
