import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, bookings, availability, groups, groupMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ bookings: [], availability: [] });

  const [userBookings, userAvailability] = await Promise.all([
    db.select().from(bookings).where(eq(bookings.profileId, profile.id)).orderBy(desc(bookings.startsAt)),
    db.select().from(availability).where(eq(availability.profileId, profile.id)),
  ]);

  // Load groups for the group picker
  const userGroups = await db.select().from(groups).where(eq(groups.profileId, profile.id));

  // For each group, get accepted member count
  const groupsWithCounts = await Promise.all(
    userGroups.map(async (g) => {
      const members = await db.select().from(groupMembers).where(
        and(eq(groupMembers.groupId, g.id), eq(groupMembers.status, "accepted"))
      );
      // Get member names for display
      const memberProfiles = await Promise.all(
        members.map(async (m) => {
          const p = await db.query.profiles.findFirst({ where: eq(profiles.id, m.memberProfileId) });
          return { profileId: m.memberProfileId, name: p?.name || "" };
        })
      );
      return { id: g.id, name: g.name, memberCount: members.length, members: memberProfiles };
    })
  );

  // Resolve assigned member names for bookings
  const bookingsWithAssignment = await Promise.all(
    userBookings.map(async (b) => {
      let assignedName = null;
      if (b.assignedMemberProfileId) {
        const p = await db.query.profiles.findFirst({ where: eq(profiles.id, b.assignedMemberProfileId) });
        assignedName = p?.name || null;
      }
      return {
        ...b,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        createdAt: b.createdAt?.toISOString() ?? null,
        assignedMemberName: assignedName,
      };
    })
  );

  return NextResponse.json({
    bookings: bookingsWithAssignment,
    availability: userAvailability,
    groups: groupsWithCounts,
    bookingGroupId: profile.bookingGroupId || "",
    bookingStrategy: profile.bookingStrategy || "least-busy",
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
      bookingSmsNumber: config.smsNumber || "",
      bookingGroupId: config.bookingGroupId ?? "",
      bookingStrategy: config.bookingStrategy || "least-busy",
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
