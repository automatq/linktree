import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, bookings, availability, teamMembers, teamAvailability } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user is a profile owner
  let profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  let isOwner = !!profile;
  let teamMember = null;

  // If not a profile owner, check if they're a team member
  if (!profile) {
    const membership = await db.select().from(teamMembers).where(
      and(eq(teamMembers.userId, userId), eq(teamMembers.status, "active"))
    );
    if (membership.length > 0) {
      teamMember = membership[0];
      profile = await db.query.profiles.findFirst({ where: eq(profiles.id, teamMember.profileId) });
    }
  }

  if (!profile) return NextResponse.json({ bookings: [], availability: [], teamMembers: [] });

  // Load team members for this profile
  const members = await db.select().from(teamMembers).where(eq(teamMembers.profileId, profile.id));

  if (isOwner) {
    // Owner sees everything
    const [userBookings, userAvailability] = await Promise.all([
      db.select().from(bookings).where(eq(bookings.profileId, profile.id)).orderBy(desc(bookings.startsAt)),
      db.select().from(availability).where(eq(availability.profileId, profile.id)),
    ]);

    // Load team availability for all members
    const allTeamAvailability: Record<string, { dayOfWeek: number; startTime: string; endTime: string }[]> = {};
    for (const member of members) {
      const memberWindows = await db.select().from(teamAvailability).where(eq(teamAvailability.teamMemberId, member.id));
      allTeamAvailability[member.id] = memberWindows.map((w) => ({
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
      }));
    }

    return NextResponse.json({
      bookings: userBookings.map((b) => ({
        ...b,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        createdAt: b.createdAt?.toISOString() ?? null,
      })),
      availability: userAvailability,
      teamMembers: members.map((m) => ({ ...m, createdAt: m.createdAt?.toISOString() ?? null })),
      teamAvailability: allTeamAvailability,
      teamBookingEnabled: profile.teamBookingEnabled,
      teamBookingStrategy: profile.teamBookingStrategy,
    });
  } else if (teamMember) {
    // Team member sees only their bookings
    const [memberBookings, memberWindows] = await Promise.all([
      db.select().from(bookings).where(
        and(eq(bookings.profileId, profile.id), eq(bookings.teamMemberId, teamMember.id))
      ).orderBy(desc(bookings.startsAt)),
      db.select().from(teamAvailability).where(eq(teamAvailability.teamMemberId, teamMember.id)),
    ]);

    return NextResponse.json({
      bookings: memberBookings.map((b) => ({
        ...b,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        createdAt: b.createdAt?.toISOString() ?? null,
      })),
      availability: [],
      teamMembers: [],
      teamAvailability: { [teamMember.id]: memberWindows.map((w) => ({ dayOfWeek: w.dayOfWeek, startTime: w.startTime, endTime: w.endTime })) },
      teamMemberId: teamMember.id,
      teamBookingEnabled: profile.teamBookingEnabled,
      teamBookingStrategy: profile.teamBookingStrategy,
    });
  }

  return NextResponse.json({ bookings: [], availability: [] });
}

// Save availability windows + booking config
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { windows, config, teamMemberWindows, teamMemberId } = body;

  // Check if profile owner
  let profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  let isOwner = !!profile;

  // If team member saving their own availability
  if (!profile && teamMemberId) {
    const membership = await db.select().from(teamMembers).where(
      and(eq(teamMembers.userId, userId), eq(teamMembers.status, "active"))
    );
    if (membership.length > 0 && membership[0].id === teamMemberId) {
      // Save team member's own availability
      await db.delete(teamAvailability).where(eq(teamAvailability.teamMemberId, teamMemberId));
      if (teamMemberWindows && teamMemberWindows.length > 0) {
        await db.insert(teamAvailability).values(
          teamMemberWindows.map((w: { dayOfWeek: number; startTime: string; endTime: string }) => ({
            teamMemberId,
            dayOfWeek: w.dayOfWeek,
            startTime: w.startTime,
            endTime: w.endTime,
          }))
        );
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Owner: update booking config
  await db.update(profiles)
    .set({
      bookingEnabled: config.enabled ?? false,
      bookingTitle: config.title || "Book a call",
      bookingDuration: config.duration ?? 30,
      bookingBuffer: config.buffer ?? 0,
      bookingAdvanceDays: config.advanceDays ?? 30,
      bookingEmail: config.email || "",
      bookingTimezone: config.timezone || "UTC",
      bookingSmsNumber: config.smsNumber || "",
      teamBookingEnabled: config.teamBookingEnabled ?? false,
      teamBookingStrategy: config.teamBookingStrategy || "least-busy",
    })
    .where(eq(profiles.userId, userId));

  // Replace profile-level availability windows
  await db.delete(availability).where(eq(availability.profileId, profile.id));
  if (windows && windows.length > 0) {
    await db.insert(availability).values(
      windows.map((w: { dayOfWeek: number; startTime: string; endTime: string }) => ({
        profileId: profile!.id,
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
