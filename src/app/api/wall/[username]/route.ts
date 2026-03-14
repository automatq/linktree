import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, wallNotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isRateLimited } from "@/lib/rate-limit";

const NOTE_COLORS = ["yellow", "blue", "green", "pink", "purple"];

// Alias for self-referencing join
const authorProfiles = profiles;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.wallEnabled) {
    return NextResponse.json({ notes: [] });
  }

  const notes = await db
    .select({
      id: wallNotes.id,
      message: wallNotes.message,
      color: wallNotes.color,
      rotation: wallNotes.rotation,
      createdAt: wallNotes.createdAt,
      authorUsername: authorProfiles.username,
      authorName: authorProfiles.name,
      authorAvatarUrl: authorProfiles.avatarUrl,
      authorAvatarInitials: authorProfiles.avatarInitials,
    })
    .from(wallNotes)
    .innerJoin(authorProfiles, eq(wallNotes.authorProfileId, authorProfiles.id))
    .where(eq(wallNotes.profileId, profile.id))
    .orderBy(desc(wallNotes.createdAt))
    .limit(profile.wallMaxNotes);

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      message: n.message,
      color: n.color,
      rotation: n.rotation,
      createdAt: n.createdAt?.toISOString(),
      authorUsername: n.authorUsername,
      authorName: n.authorName,
      authorAvatarUrl: n.authorAvatarUrl,
      authorAvatarInitials: n.authorAvatarInitials,
    })),
    title: profile.wallTitle,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in to post" }, { status: 401 });
  }

  const authorProfile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  if (!authorProfile) {
    return NextResponse.json({ error: "You need a profile to post" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(`wall:${ip}`, 3, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "Slow down — try again in a few minutes" }, { status: 429 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.wallEnabled) {
    return NextResponse.json({ error: "Wall not available" }, { status: 404 });
  }

  const body = await req.json();
  const message = (body.message || "").trim().slice(0, 120);
  const color = NOTE_COLORS.includes(body.color) ? body.color : "yellow";

  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const rotation = Math.floor(Math.random() * 13) - 6;

  const id = crypto.randomUUID();
  await db.insert(wallNotes).values({
    id,
    profileId: profile.id,
    authorProfileId: authorProfile.id,
    message,
    color,
    rotation,
  });

  // Prune old notes if over limit
  const allNotes = await db
    .select({ id: wallNotes.id })
    .from(wallNotes)
    .where(eq(wallNotes.profileId, profile.id))
    .orderBy(desc(wallNotes.createdAt));

  if (allNotes.length > profile.wallMaxNotes) {
    const toDelete = allNotes.slice(profile.wallMaxNotes).map((n) => n.id);
    for (const delId of toDelete) {
      await db.delete(wallNotes).where(eq(wallNotes.id, delId));
    }
  }

  return NextResponse.json({
    ok: true,
    note: {
      id,
      message,
      color,
      rotation,
      createdAt: new Date().toISOString(),
      authorUsername: authorProfile.username,
      authorName: authorProfile.name,
      authorAvatarUrl: authorProfile.avatarUrl,
      authorAvatarInitials: authorProfile.avatarInitials,
    },
  });
}
