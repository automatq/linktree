import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, previousUsernames } from "@/db/schema";
import { eq } from "drizzle-orm";

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const RESERVED = new Set([
  "admin", "api", "app", "book", "embed", "sign-in", "sign-up",
  "settings", "help", "about", "terms", "privacy", "support",
  "purchase", "go", "t", "icon.svg",
]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username: rawUsername } = await req.json();
  const username = (rawUsername || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-30 characters: letters, numbers, hyphens, underscores" },
      { status: 400 },
    );
  }

  if (RESERVED.has(username)) {
    return NextResponse.json({ error: "That username is reserved" }, { status: 400 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Same username — no-op
  if (profile.username === username) {
    return NextResponse.json({ ok: true, username });
  }

  // Enforce 30-day cooldown
  if (profile.usernameChangedAt) {
    const elapsed = Date.now() - profile.usernameChangedAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      const daysLeft = Math.ceil((COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
      return NextResponse.json(
        { error: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` },
        { status: 429 },
      );
    }
  }

  // Check if username is taken by another profile
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.username, username),
  });
  if (existing && existing.id !== profile.id) {
    return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
  }

  // Check if username is held as a previous username by someone else
  const held = await db.query.previousUsernames.findFirst({
    where: eq(previousUsernames.username, username),
  });
  if (held && held.profileId !== profile.id) {
    return NextResponse.json({ error: "That username is currently reserved" }, { status: 409 });
  }

  // Store old username for redirect (30-day reservation)
  const oldUsername = profile.username;

  // Remove any existing reservation for the old username (in case they changed before)
  await db.delete(previousUsernames)
    .where(eq(previousUsernames.username, oldUsername));

  await db.insert(previousUsernames).values({
    profileId: profile.id,
    username: oldUsername,
  });

  // Update profile
  await db.update(profiles)
    .set({ username, usernameChangedAt: new Date() })
    .where(eq(profiles.id, profile.id));

  return NextResponse.json({ ok: true, username });
}
