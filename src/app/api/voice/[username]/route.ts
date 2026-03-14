import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, voiceRooms, voiceNotes } from "@/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { put } from "@vercel/blob";
import { isRateLimited } from "@/lib/rate-limit";

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
        .select()
        .from(voiceNotes)
        .where(eq(voiceNotes.roomId, room.id))
        .orderBy(desc(voiceNotes.createdAt))
        .limit(50);
      return {
        id: room.id,
        prompt: room.prompt,
        createdAt: room.createdAt?.toISOString(),
        notes: notes.map((n) => ({
          id: n.id,
          authorName: n.authorName,
          audioUrl: n.audioUrl,
          duration: n.duration,
          createdAt: n.createdAt?.toISOString(),
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
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  // Rate limit: 2 voice notes per 10 minutes per IP
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
  const authorName = ((formData.get("authorName") as string) || "").trim().slice(0, 30);
  const duration = parseInt((formData.get("duration") as string) || "0", 10);

  if (!audio || !roomId) {
    return NextResponse.json({ error: "Audio and roomId required" }, { status: 400 });
  }

  // Verify room exists and is active
  const room = await db.query.voiceRooms.findFirst({
    where: and(eq(voiceRooms.id, roomId), eq(voiceRooms.profileId, profile.id), eq(voiceRooms.active, true)),
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  // Validate duration (max 90 seconds)
  if (duration > 90) {
    return NextResponse.json({ error: "Voice note too long (max 90 seconds)" }, { status: 400 });
  }

  // Validate file size (max 5MB)
  if (audio.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  // Upload to Vercel Blob
  const blob = await put(`voice-notes/${profile.id}-${Date.now()}.webm`, audio, {
    access: "public",
    allowOverwrite: true,
  });

  const id = crypto.randomUUID();
  await db.insert(voiceNotes).values({
    id,
    roomId,
    profileId: profile.id,
    authorName,
    audioUrl: blob.url,
    duration: Math.min(duration, 90),
  });

  return NextResponse.json({
    ok: true,
    note: { id, authorName, audioUrl: blob.url, duration, createdAt: new Date().toISOString() },
  });
}
