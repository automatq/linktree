import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, voiceRooms, voiceNotes } from "@/db/schema";
import { eq, asc, and, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ rooms: [], voiceRoomsEnabled: false });

  const rooms = await db
    .select()
    .from(voiceRooms)
    .where(eq(voiceRooms.profileId, profile.id))
    .orderBy(asc(voiceRooms.position));

  // Fetch notes for each room
  const roomsWithNotes = await Promise.all(
    rooms.map(async (room) => {
      const notes = await db
        .select()
        .from(voiceNotes)
        .where(eq(voiceNotes.roomId, room.id))
        .orderBy(desc(voiceNotes.createdAt));
      return {
        ...room,
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

  return NextResponse.json({
    rooms: roomsWithNotes,
    voiceRoomsEnabled: profile.voiceRoomsEnabled,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  // Toggle voice rooms enabled
  if (action === "settings") {
    await db.update(profiles).set({ voiceRoomsEnabled: body.voiceRoomsEnabled }).where(eq(profiles.userId, userId));
    return NextResponse.json({ ok: true });
  }

  // Create a new room/prompt
  if (action === "create") {
    const id = crypto.randomUUID();
    const existing = await db.select().from(voiceRooms).where(eq(voiceRooms.profileId, profile.id));
    await db.insert(voiceRooms).values({
      id,
      profileId: profile.id,
      prompt: body.prompt || "What's on your mind?",
      position: existing.length,
    });
    return NextResponse.json({ id });
  }

  // Update room prompt
  if (action === "update") {
    await db
      .update(voiceRooms)
      .set({ prompt: body.prompt, active: body.active })
      .where(and(eq(voiceRooms.id, body.roomId), eq(voiceRooms.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  // Delete a room (cascades notes)
  if (action === "delete") {
    await db
      .delete(voiceRooms)
      .where(and(eq(voiceRooms.id, body.roomId), eq(voiceRooms.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  // Delete a specific voice note (moderation)
  if (action === "deleteNote") {
    // Verify ownership through room
    const room = await db.query.voiceRooms.findFirst({
      where: and(eq(voiceRooms.id, body.roomId), eq(voiceRooms.profileId, profile.id)),
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    await db.delete(voiceNotes).where(and(eq(voiceNotes.id, body.noteId), eq(voiceNotes.roomId, body.roomId)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
