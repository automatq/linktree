import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, wallNotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isRateLimited } from "@/lib/rate-limit";

const NOTE_COLORS = ["yellow", "blue", "green", "pink", "purple"];

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
    .select()
    .from(wallNotes)
    .where(eq(wallNotes.profileId, profile.id))
    .orderBy(desc(wallNotes.createdAt))
    .limit(profile.wallMaxNotes);

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      authorName: n.authorName,
      message: n.message,
      color: n.color,
      rotation: n.rotation,
      createdAt: n.createdAt?.toISOString(),
    })),
    title: profile.wallTitle,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  // Rate limit: 3 notes per 5 minutes per IP
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
  const authorName = (body.authorName || "").trim().slice(0, 30);
  const color = NOTE_COLORS.includes(body.color) ? body.color : "yellow";

  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Random slight rotation for organic feel
  const rotation = Math.floor(Math.random() * 13) - 6; // -6 to 6 degrees

  const id = crypto.randomUUID();
  await db.insert(wallNotes).values({
    id,
    profileId: profile.id,
    authorName,
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
    note: { id, authorName, message, color, rotation, createdAt: new Date().toISOString() },
  });
}
