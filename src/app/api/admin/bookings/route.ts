import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, bookings, availability, groups, groupMembers, blockedDates } from "@/db/schema";
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

  // Load groups the user OWNS (for the group picker)
  const userGroups = await db.select().from(groups).where(eq(groups.profileId, profile.id));

  const groupsWithCounts = await Promise.all(
    userGroups.map(async (g) => {
      const members = await db.select().from(groupMembers).where(
        and(eq(groupMembers.groupId, g.id), eq(groupMembers.status, "accepted"))
      );
      const memberProfiles = await Promise.all(
        members.map(async (m) => {
          const p = await db.query.profiles.findFirst({ where: eq(profiles.id, m.memberProfileId) });
          return { profileId: m.memberProfileId, name: p?.name || "", role: m.role || "member" };
        })
      );
      return { id: g.id, name: g.name, memberCount: members.length, members: memberProfiles };
    })
  );

  // Check if user is a MEMBER of any group that's linked as a shared calendar
  let linkedCalendar: { groupName: string; ownerName: string; ownerUsername: string; members: { name: string; role: string }[]; myRole: string } | null = null;

  const myMemberships = await db.select().from(groupMembers).where(
    and(eq(groupMembers.memberProfileId, profile.id), eq(groupMembers.status, "accepted"))
  );

  for (const membership of myMemberships) {
    // Find the group
    const group = await db.select().from(groups).where(eq(groups.id, membership.groupId));
    if (!group[0]) continue;

    // Check if the group owner has this group linked as their booking calendar
    const ownerProfile = await db.query.profiles.findFirst({ where: eq(profiles.id, group[0].profileId) });
    if (!ownerProfile || ownerProfile.bookingGroupId !== group[0].id) continue;

    // This group IS linked as a shared calendar — build the info
    const allMembers = await db.select().from(groupMembers).where(
      and(eq(groupMembers.groupId, group[0].id), eq(groupMembers.status, "accepted"))
    );
    const memberNames = await Promise.all(
      allMembers.map(async (m) => {
        const p = await db.query.profiles.findFirst({ where: eq(profiles.id, m.memberProfileId) });
        return { name: p?.name || "", role: m.role || "member" };
      })
    );
    // Include the owner
    memberNames.unshift({ name: ownerProfile.name, role: "owner" });

    linkedCalendar = {
      groupName: group[0].name,
      ownerName: ownerProfile.name,
      ownerUsername: ownerProfile.username,
      members: memberNames,
      myRole: membership.role || "member",
    };
    break; // only one linked calendar matters
  }

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

  // Parse embed sites
  let embedSites: { origin: string; lastSeen: string }[] = [];
  try { embedSites = JSON.parse(profile.bookingEmbedSites || "[]"); } catch {}

  // Load blocked dates
  const userBlockedDates = await db.select().from(blockedDates).where(eq(blockedDates.profileId, profile.id));

  return NextResponse.json({
    bookings: bookingsWithAssignment,
    availability: userAvailability,
    groups: groupsWithCounts,
    bookingGroupId: profile.bookingGroupId || "",
    bookingStrategy: profile.bookingStrategy || "least-busy",
    embedSites,
    blockedDates: userBlockedDates.map((b) => b.date),
    config: {
      enabled: profile.bookingEnabled,
      title: profile.bookingTitle,
      duration: profile.bookingDuration,
      buffer: profile.bookingBuffer,
      advanceDays: profile.bookingAdvanceDays,
      email: profile.bookingEmail,
      timezone: profile.bookingTimezone,
      smsNumber: profile.bookingSmsNumber,
      reminderRules: (() => { try { return JSON.parse(profile.bookingReminderRules || "[]"); } catch { return []; } })(),
    },
    linkedCalendar,
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
      bookingReminderRules: JSON.stringify(config.reminderRules ?? []),
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

// Toggle a blocked date on/off
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, blocked } = body; // date: "YYYY-MM-DD", blocked: boolean

  if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (blocked) {
    // Check if already blocked
    const existing = await db.select().from(blockedDates).where(
      and(eq(blockedDates.profileId, profile.id), eq(blockedDates.date, date))
    );
    if (existing.length === 0) {
      await db.insert(blockedDates).values({ profileId: profile.id, date });
    }
  } else {
    await db.delete(blockedDates).where(
      and(eq(blockedDates.profileId, profile.id), eq(blockedDates.date, date))
    );
  }

  return NextResponse.json({ ok: true });
}
