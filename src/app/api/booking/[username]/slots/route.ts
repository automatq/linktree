import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, availability, bookings } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { generateSlots, utcToLocalDate, getDayOfWeek } from "@/lib/slots";

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

  // If no date given, return available dates for the next N days
  if (!date) {
    const advanceDays = profile.bookingAdvanceDays ?? 30;
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

  // Return slots for a specific date
  const windows = await db.select().from(availability).where(eq(availability.profileId, profile.id));

  // Get existing confirmed bookings that overlap with this date
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

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
    profile.bookingDuration ?? 30,
    profile.bookingBuffer ?? 0,
    tz
  );

  return NextResponse.json({
    slots: slots.map((s) => s.toISOString()),
    duration: profile.bookingDuration ?? 30,
    timezone: tz,
  });
}
