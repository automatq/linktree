import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { profiles, subscribers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fireWebhook } from "@/lib/webhook";
import { isRateLimited } from "@/lib/rate-limit";

function genId() {
  return crypto.randomUUID();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Rate limit: 10 subscribe attempts per IP per 15 minutes
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`subscribe:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { email, name } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile || !profile.emailCaptureEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ignore duplicates
  const existing = await db.query.subscribers.findFirst({
    where: and(eq(subscribers.profileId, profile.id), eq(subscribers.email, email.toLowerCase())),
  });

  if (!existing) {
    await db.insert(subscribers).values({
      id: genId(),
      profileId: profile.id,
      email: email.toLowerCase().trim(),
      name: name?.trim() || "",
    });

    // Fire webhook after response is sent — no latency impact
    const webhookUrl = profile.webhookUrl;
    if (webhookUrl) {
      after(() =>
        fireWebhook(webhookUrl, "subscriber.created", {
          username: profile.username,
          email: email.toLowerCase().trim(),
          name: name?.trim() || "",
        })
      );
    }
  }

  return NextResponse.json({ ok: true });
}
