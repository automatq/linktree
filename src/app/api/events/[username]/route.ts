import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, events, eventRsvps } from "@/db/schema";
import { eq, asc, and, sql, gte } from "drizzle-orm";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.eventsEnabled) {
    return NextResponse.json({ events: [] });
  }

  // Get active events that haven't ended yet (or have no end date and start is in the future or today)
  const now = new Date();
  const activeEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.profileId, profile.id), eq(events.active, true)))
    .orderBy(asc(events.startsAt));

  // Filter: show events that haven't ended (or if no endsAt, started less than 24h ago)
  const visibleEvents = activeEvents.filter((e) => {
    if (e.endsAt) return e.endsAt > now;
    // If no end time, show until 24h after start
    return e.startsAt.getTime() + 24 * 60 * 60 * 1000 > now.getTime();
  });

  // Get current user
  const { userId } = await auth();
  let attendeeProfileId: number | null = null;
  if (userId) {
    const attendee = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
    if (attendee) attendeeProfileId = attendee.id;
  }

  const eventsWithRsvps = await Promise.all(
    visibleEvents.map(async (event) => {
      // Count RSVPs
      const [goingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));

      const [interestedCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "interested")));

      // Get attendee avatars (first 5 going)
      const attendees = await db
        .select({
          avatarUrl: profiles.avatarUrl,
          avatarInitials: profiles.avatarInitials,
          username: profiles.username,
        })
        .from(eventRsvps)
        .innerJoin(profiles, eq(eventRsvps.attendeeProfileId, profiles.id))
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")))
        .limit(5);

      // Check user's RSVP
      let userRsvp: string | null = null;
      if (attendeeProfileId) {
        const existing = await db
          .select({ status: eventRsvps.status })
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.attendeeProfileId, attendeeProfileId)))
          .limit(1);
        if (existing.length > 0) userRsvp = existing[0].status;
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        coverUrl: event.coverUrl,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        maxAttendees: event.maxAttendees,
        going: goingCount.count,
        interested: interestedCount.count,
        attendees: attendees.map((a) => ({
          avatarUrl: a.avatarUrl,
          avatarInitials: a.avatarInitials,
          username: a.username,
        })),
        userRsvp,
      };
    })
  );

  return NextResponse.json({ events: eventsWithRsvps });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in to RSVP" }, { status: 401 });
  }

  const attendee = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!attendee) {
    return NextResponse.json({ error: "You need a profile to RSVP" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(`event:${ip}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: "Slow down — try again in a minute" }, { status: 429 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.eventsEnabled) {
    return NextResponse.json({ error: "Events not available" }, { status: 404 });
  }

  const body = await req.json();
  const { eventId, status } = body; // status: "going" | "interested" | "cancel"

  if (!eventId || !["going", "interested", "cancel"].includes(status)) {
    return NextResponse.json({ error: "eventId and status (going/interested/cancel) required" }, { status: 400 });
  }

  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.profileId, profile.id), eq(events.active, true)),
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Check existing RSVP
  const existing = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.attendeeProfileId, attendee.id)))
    .limit(1);

  if (status === "cancel") {
    if (existing.length > 0) {
      await db.delete(eventRsvps).where(eq(eventRsvps.id, existing[0].id));
    }
    return NextResponse.json({ ok: true, action: "cancelled" });
  }

  // Check capacity for "going"
  if (status === "going" && event.maxAttendees) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "going")));
    // Don't count against capacity if already going
    const alreadyGoing = existing.length > 0 && existing[0].status === "going";
    if (count >= event.maxAttendees && !alreadyGoing) {
      return NextResponse.json({ error: "This event is full" }, { status: 400 });
    }
  }

  if (existing.length > 0) {
    // Update status
    await db.update(eventRsvps).set({ status }).where(eq(eventRsvps.id, existing[0].id));
  } else {
    // Create RSVP
    await db.insert(eventRsvps).values({
      id: crypto.randomUUID(),
      eventId,
      attendeeProfileId: attendee.id,
      status,
    });
  }

  return NextResponse.json({ ok: true, action: status });
}
