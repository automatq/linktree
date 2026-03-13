import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, trackedLinks, trackedLinkClicks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

function genCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ links: [] });

  const rows = await db
    .select({
      id: trackedLinks.id,
      name: trackedLinks.name,
      destinationUrl: trackedLinks.destinationUrl,
      createdAt: trackedLinks.createdAt,
      clicks: sql<number>`count(${trackedLinkClicks.id})::int`,
    })
    .from(trackedLinks)
    .leftJoin(trackedLinkClicks, eq(trackedLinks.id, trackedLinkClicks.trackedLinkId))
    .where(eq(trackedLinks.profileId, profile.id))
    .groupBy(trackedLinks.id, trackedLinks.name, trackedLinks.destinationUrl, trackedLinks.createdAt)
    .orderBy(trackedLinks.createdAt);

  return NextResponse.json({ links: rows });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, destinationUrl } = await req.json();
  if (!name?.trim() || !destinationUrl?.trim()) {
    return NextResponse.json({ error: "Name and destination URL are required" }, { status: 400 });
  }

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const id = genCode();
  await db.insert(trackedLinks).values({
    id,
    profileId: profile.id,
    name: name.trim(),
    destinationUrl: destinationUrl.trim(),
  });

  return NextResponse.json({ id, name: name.trim(), destinationUrl: destinationUrl.trim(), clicks: 0 });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Verify ownership
  const link = await db.query.trackedLinks.findFirst({ where: eq(trackedLinks.id, id) });
  if (!link || link.profileId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(trackedLinks).where(eq(trackedLinks.id, id));
  return NextResponse.json({ ok: true });
}
