import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, availability, bookings, teamMembers, teamAvailability } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { generateSlots, generateTeamSlots, utcToLocalDate, getDayOfWeek } from "@/lib/slots";
import type { TeamMemberSlotInfo } from "@/lib/slots";

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // "YYYY-MM-DD" in host's timezone

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile || !profile.bookingEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tz = profile.bookingTimezone || "UTC";
  const duration = profile.bookingDuration ?? 30;
  const buffer = profile.bookingBuffer ?? 0;
  const advanceDays = profile.bookingAdvanceDays ?? 30;

  // Check if team booking is enabled with active members
  const activeMembers = profile.teamBookingEnabled
    ? await db.select().from(teamMembers).where(
        and(eq(teamMembers.profileId, profile.id), eq(teamMembers.status, "active"))
      )
    : [];

  const isTeamMode = profile.teamBookingEnabled && activeMembers.length > 0;

  // --- Available dates (no date param) ---
  if (!date) {
    if (isTeamMode) {
      // Union of all team members' available days
      const allWindows: { teamMemberId: string; dayOfWeek: number }[] = [];
      for (const member of activeMembers) {
        const memberWindows = await db.select().from(teamAvailability).where(
          eq(teamAvailability.teamMemberId, member.id)
        );
        allWindows.push(...memberWindows.map((w) => ({ teamMemberId: w.teamMemberId, dayOfWeek: w.dayOfWeek })));
      }

      if (allWindows.length === 0) return NextResponse.json({ dates: [], timezone: tz });

      const availableDays = new Set(allWindows.map((w) => w.dayOfWeek));
      const dates: string[] = [];
      const now = new Date();
      for (let i = 1; i <= advanceDays; i++) {
        const d = new Date(now.getTime() + i * 86400000);
        const dateStr = utcToLocalDate(d, tz);
        const dow = getDayOfWeek(dateStr, tz);
        if (availableDays.has(dow)) dates.push(dateStr);
      }

      return NextResponse.json({ dates, timezone: tz });
    }

    // Solo mode — existing logic
    const windows = await db.select().from(availability).where(eq(availability.profileId, profile.id));
    if (windows.length === 0) return NextResponse.json({ dates: [] });

    const availableDays = new Set(windows.map((w) => w.dayOfWeek));
    const dates: string[] = [];
    const now = new Date();
    for (let i = 1; i <= advanceDays; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const dateStr = utcToLocalDate(d, tz);
      const dow = getDayOfWeek(dateStr, tz);
      if (availableDays.has(dow)) dates.push(dateStr);
    }

    return NextResponse.json({ dates, timezone: tz });
  }

  // --- Slots for a specific date ---
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  if (isTeamMode) {
    // Build per-member slot info
    const memberSlotInfos: TeamMemberSlotInfo[] = [];

    for (const member of activeMembers) {
      const [memberWindows, memberBookings] = await Promise.all([
        db.select().from(teamAvailability).where(eq(teamAvailability.teamMemberId, member.id)),
        db.select().from(bookings).where(
          and(
            eq(bookings.profileId, profile.id),
            eq(bookings.teamMemberId, member.id),
            eq(bookings.status, "confirmed"),
            gte(bookings.startsAt, dayStart),
            lte(bookings.startsAt, dayEnd)
          )
        ),
      ]);

      memberSlotInfos.push({
        memberId: member.id,
        windows: memberWindows.map((w) => ({
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
        existing: memberBookings.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
        timezone: member.timezone || tz,
      });
    }

    const teamSlots = generateTeamSlots(date, memberSlotInfos, duration, buffer);

    return NextResponse.json({
      slots: teamSlots.map((s) => s.startsAt.toISOString()),
      duration,
      timezone: tz,
    });
  }

  // Solo mode — existing logic
  const windows = await db.select().from(availability).where(eq(availability.profileId, profile.id));
  const existing = await db.select().from(bookings).where(
    and(
      eq(bookings.profileId, profile.id),
      eq(bookings.status, "confirmed"),
      gte(bookings.startsAt, dayStart),
      lte(bookings.startsAt, dayEnd)
    )
  );

  const slots = generateSlots(
    date,
    windows,
    existing.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    duration,
    buffer,
    tz
  );

  return NextResponse.json({
    slots: slots.map((s) => s.toISOString()),
    duration,
    timezone: tz,
  });
}
