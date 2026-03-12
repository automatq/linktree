import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, bookings, availability } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ bookings: [], availability: [] });

  const [userBookings, userAvailability] = await Promise.all([
    db.select().from(bookings).where(eq(bookings.profileId, profile.id)).orderBy(desc(bookings.startsAt)),
    db.select().from(availability).where(eq(availability.profileId, profile.id)),
  ]);

  return NextResponse.json({
    bookings: userBookings.map((b) => ({
      ...b,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      createdAt: b.createdAt?.toISOString() ?? null,
    })),
    availability: userAvailability,
  });
}

// Save availability windows + booking config
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { windows, config } = body;

  let profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Update booking config on profile
  await db.update(profiles)
    .set({
      bookingEnabled: config.enabled ?? false,
      bookingTitle: config.title || "Book a call",
      bookingDuration: config.duration ?? 30,
      bookingBuffer: config.buffer ?? 0,
      bookingAdvanceDays: config.advanceDays ?? 30,
      bookingEmail: config.email || "",
      bookingTimezone: config.timezone || "UTC",
    })
    .where(eq(profiles.userId, userId));

  // Replace availability windows
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
