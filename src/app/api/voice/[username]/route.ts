import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, voiceRooms, voiceNotes } from "@/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { put } from "@vercel/blob";
import { isRateLimited } from "@/lib/rate-limit";

const authorProfiles = profiles;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.voiceRoomsEnabled) {
    return NextResponse.json({ rooms: [] });
  }

  const rooms = await db
    .select()
    .from(voiceRooms)
    .where(and(eq(voiceRooms.profileId, profile.id), eq(voiceRooms.active, true)))
    .orderBy(asc(voiceRooms.position));

  const roomsWithNotes = await Promise.all(
    rooms.map(async (room) => {
      const notes = await db
        .select({
          id: voiceNotes.id,
          audioUrl: voiceNotes.audioUrl,
          duration: voiceNotes.duration,
          createdAt: voiceNotes.createdAt,
          authorUsername: authorProfiles.username,
          authorName: authorProfiles.name,
          authorAvatarUrl: authorProfiles.avatarUrl,
          authorAvatarInitials: authorProfiles.avatarInitials,
        })
        .from(voiceNotes)
        .innerJoin(authorProfiles, eq(voiceNotes.authorProfileId, authorProfiles.id))
        .where(eq(voiceNotes.roomId, room.id))
        .orderBy(desc(voiceNotes.createdAt))
        .limit(50);
      return {
        id: room.id,
        prompt: room.prompt,
        createdAt: room.createdAt?.toISOString(),
        notes: notes.map((n) => ({
          id: n.id,
          audioUrl: n.audioUrl,
          duration: n.duration,
          createdAt: n.createdAt?.toISOString(),
          authorUsername: n.authorUsername,
          authorName: n.authorName,
          authorAvatarUrl: n.authorAvatarUrl,
          authorAvatarInitials: n.authorAvatarInitials,
        })),
      };
    })
  );

  return NextResponse.json({ rooms: roomsWithNotes });
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
  if (isRateLimited(`voice:${ip}`, 2, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Slow down — try again in a few minutes" }, { status: 429 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.voiceRoomsEnabled) {
    return NextResponse.json({ error: "Voice rooms not available" }, { status: 404 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  const roomId = formData.get("roomId") as string | null;
  const duration = parseInt((formData.get("duration") as string) || "0", 10);

  if (!audio || !roomId) {
    return NextResponse.json({ error: "Audio and roomId required" }, { status: 400 });
  }

  const room = await db.query.voiceRooms.findFirst({
    where: and(eq(voiceRooms.id, roomId), eq(voiceRooms.profileId, profile.id), eq(voiceRooms.active, true)),
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  if (duration > 90) {
    return NextResponse.json({ error: "Voice note too long (max 90 seconds)" }, { status: 400 });
  }

  if (audio.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const blob = await put(`voice-notes/${profile.id}-${Date.now()}.webm`, audio, {
    access: "public",
    allowOverwrite: true,
  });

  const id = crypto.randomUUID();
  await db.insert(voiceNotes).values({
    id,
    roomId,
    profileId: profile.id,
    authorProfileId: authorProfile.id,
    audioUrl: blob.url,
    duration: Math.min(duration, 90),
  });

  return NextResponse.json({
    ok: true,
    note: {
      id,
      audioUrl: blob.url,
      duration,
      createdAt: new Date().toISOString(),
      authorUsername: authorProfile.username,
      authorName: authorProfile.name,
      authorAvatarUrl: authorProfile.avatarUrl,
      authorAvatarInitials: authorProfile.avatarInitials,
    },
  });
}
