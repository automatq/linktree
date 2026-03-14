import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, wallNotes } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ notes: [], wallEnabled: false });

  const notes = await db
    .select()
    .from(wallNotes)
    .where(eq(wallNotes.profileId, profile.id))
    .orderBy(desc(wallNotes.createdAt))
    .limit(200);

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      authorName: n.authorName,
      message: n.message,
      color: n.color,
      rotation: n.rotation,
      createdAt: n.createdAt?.toISOString(),
    })),
    wallEnabled: profile.wallEnabled,
    wallTitle: profile.wallTitle,
    wallMaxNotes: profile.wallMaxNotes,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  // Update wall settings
  if (action === "settings") {
    await db.update(profiles).set({
      wallEnabled: body.wallEnabled,
      wallTitle: body.wallTitle,
      wallMaxNotes: body.wallMaxNotes,
    }).where(eq(profiles.userId, userId));
    return NextResponse.json({ ok: true });
  }

  // Delete a note (moderation)
  if (action === "delete") {
    await db
      .delete(wallNotes)
      .where(and(eq(wallNotes.id, body.noteId), eq(wallNotes.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  // Clear all notes
  if (action === "clear") {
    await db.delete(wallNotes).where(eq(wallNotes.profileId, profile.id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
