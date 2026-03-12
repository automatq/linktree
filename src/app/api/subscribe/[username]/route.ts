import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, subscribers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function genId() {
  return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 11);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
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
  }

  return NextResponse.json({ ok: true });
}
