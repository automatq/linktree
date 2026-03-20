import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, events, eventRsvps } from "@/db/schema";
import { eq, asc, and, sql } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ events: [], eventsEnabled: false });

  const userEvents = await db
    .select()
    .from(events)
    .where(eq(events.profileId, profile.id))
    .orderBy(asc(events.startsAt));

  const eventsWithCounts = await Promise.all(
    userEvents.map(async (event) => {
      const [goingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));

      const [interestedCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "interested")));

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        coverUrl: event.coverUrl,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        maxAttendees: event.maxAttendees,
        active: event.active,
        going: goingCount.count,
        interested: interestedCount.count,
      };
    })
  );

  return NextResponse.json({
    eventsEnabled: profile.eventsEnabled,
    events: eventsWithCounts,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  if (action === "settings") {
    await db.update(profiles).set({
      eventsEnabled: body.eventsEnabled,
    }).where(eq(profiles.userId, userId));
    return NextResponse.json({ ok: true });
  }

  if (action === "create") {
    const title = (body.title || "").trim().slice(0, 150);
    const description = (body.description || "").trim().slice(0, 500);
    const location = (body.location || "").trim().slice(0, 200);
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;

    if (!title || !startsAt || isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "Title and start date required" }, { status: 400 });
    }

    const existing = await db.select({ position: events.position }).from(events).where(eq(events.profileId, profile.id)).orderBy(asc(events.position));
    const nextPos = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;

    const eventId = crypto.randomUUID();
    await db.insert(events).values({
      id: eventId,
      profileId: profile.id,
      title,
      description,
      location,
      coverUrl: body.coverUrl || "",
      startsAt,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      maxAttendees: body.maxAttendees ? parseInt(body.maxAttendees) : null,
      position: nextPos,
    });

    return NextResponse.json({
      ok: true,
      event: {
        id: eventId,
        title,
        description,
        location,
        coverUrl: body.coverUrl || "",
        startsAt: startsAt.toISOString(),
        endsAt: body.endsAt ?? null,
        maxAttendees: body.maxAttendees ? parseInt(body.maxAttendees) : null,
        active: true,
        going: 0,
        interested: 0,
      },
    });
  }

  if (action === "update") {
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = (body.title || "").trim().slice(0, 150);
    if (body.description !== undefined) updates.description = (body.description || "").trim().slice(0, 500);
    if (body.location !== undefined) updates.location = (body.location || "").trim().slice(0, 200);
    if (body.startsAt !== undefined) updates.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) updates.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.maxAttendees !== undefined) updates.maxAttendees = body.maxAttendees ? parseInt(body.maxAttendees) : null;
    if (body.coverUrl !== undefined) updates.coverUrl = body.coverUrl;
    if (body.active !== undefined) updates.active = body.active;

    await db.update(events).set(updates).where(and(eq(events.id, body.eventId), eq(events.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    await db.delete(events).where(and(eq(events.id, body.eventId), eq(events.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
