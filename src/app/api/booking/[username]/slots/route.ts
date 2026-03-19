import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { profiles, availability, bookings, groups, groupMembers } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { generateSlots, generateGroupSlots, utcToLocalDate, getDayOfWeek } from "@/lib/slots";
import type { GroupMemberSlotInfo } from "@/lib/slots";

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

/**
 * Track the origin of booking API requests (referer/origin header).
 * Stores up to 20 unique origins with last-seen timestamp.
 */
function trackEmbedSite(profile: { id: number; bookingEmbedSites: string }, origin: string | null) {
  if (!origin) return;
  try {
    const url = new URL(origin);
    const site = url.origin; // e.g. "https://www.axiomflow.ca"
    // Skip same-site requests (trilink itself)
    if (site.includes("trilink") || site.includes("localhost") || site.includes("127.0.0.1")) return;

    const existing: { origin: string; lastSeen: string }[] = JSON.parse(profile.bookingEmbedSites || "[]");
    const now = new Date().toISOString();
    const idx = existing.findIndex((e) => e.origin === site);

    if (idx >= 0) {
      // Only update if last seen more than 1 hour ago (avoid spamming DB)
      const lastSeen = new Date(existing[idx].lastSeen).getTime();
      if (Date.now() - lastSeen < 3600000) return;
      existing[idx].lastSeen = now;
    } else {
      existing.push({ origin: site, lastSeen: now });
      if (existing.length > 20) existing.shift(); // cap at 20
    }

    db.update(profiles)
      .set({ bookingEmbedSites: JSON.stringify(existing) })
      .where(eq(profiles.id, profile.id))
      .then(() => {})
      .catch(() => {});
  } catch {}
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile || !profile.bookingEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Track embed site (fire-and-forget, no latency impact)
  const origin = req.headers.get("origin") || req.headers.get("referer");
  after(() => trackEmbedSite(profile, origin));

  const tz = profile.bookingTimezone || "UTC";
  const duration = profile.bookingDuration ?? 30;
  const buffer = profile.bookingBuffer ?? 0;
  const advanceDays = profile.bookingAdvanceDays ?? 30;

  // Check if shared group calendar is active
  const groupId = profile.bookingGroupId || "";
  let acceptedMembers: { profileId: number }[] = [];

  if (groupId) {
    // Verify group exists and belongs to this profile
    const group = await db.select().from(groups).where(
      and(eq(groups.id, groupId), eq(groups.profileId, profile.id))
    );
    if (group.length > 0) {
      const members = await db.select().from(groupMembers).where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "accepted"))
      );
      acceptedMembers = members.map((m) => ({ profileId: m.memberProfileId }));
    }
  }

  const isGroupMode = acceptedMembers.length > 0;

  // --- Available dates (no date param) ---
  if (!date) {
    if (isGroupMode) {
      // Union of all group members' available days
      const allDays = new Set<number>();
      for (const member of acceptedMembers) {
        const memberWindows = await db.select().from(availability).where(
          eq(availability.profileId, member.profileId)
        );
        memberWindows.forEach((w) => allDays.add(w.dayOfWeek));
      }

      if (allDays.size === 0) return NextResponse.json({ dates: [], timezone: tz });

      const dates: string[] = [];
      const now = new Date();
      for (let i = 1; i <= advanceDays; i++) {
        const d = new Date(now.getTime() + i * 86400000);
        const dateStr = utcToLocalDate(d, tz);
        const dow = getDayOfWeek(dateStr, tz);
        if (allDays.has(dow)) dates.push(dateStr);
      }

      return NextResponse.json({ dates, timezone: tz });
    }

    // Solo mode
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

  if (isGroupMode) {
    const memberSlotInfos: GroupMemberSlotInfo[] = [];

    for (const member of acceptedMembers) {
      const memberProfile = await db.query.profiles.findFirst({
        where: eq(profiles.id, member.profileId),
      });

      const [memberWindows, memberBookings] = await Promise.all([
        db.select().from(availability).where(eq(availability.profileId, member.profileId)),
        db.select().from(bookings).where(
          and(
            eq(bookings.profileId, profile.id),
            eq(bookings.assignedMemberProfileId, member.profileId),
            eq(bookings.status, "confirmed"),
            gte(bookings.startsAt, dayStart),
            lte(bookings.startsAt, dayEnd)
          )
        ),
      ]);

      memberSlotInfos.push({
        profileId: member.profileId,
        windows: memberWindows.map((w) => ({
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
        existing: memberBookings.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
        timezone: memberProfile?.bookingTimezone || tz,
      });
    }

    const groupSlots = generateGroupSlots(date, memberSlotInfos, duration, buffer);

    return NextResponse.json({
      slots: groupSlots.map((s) => s.startsAt.toISOString()),
      duration,
      timezone: tz,
    });
  }

  // Solo mode
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
