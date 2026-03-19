import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { profiles, availability, bookings, groups, groupMembers, blockedDates } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { generateSlots, generateGroupSlots, pickGroupMember } from "@/lib/slots";
import type { GroupMemberSlotInfo } from "@/lib/slots";
import { sendGuestConfirmation, sendHostNotification, sendGuestReminder } from "@/lib/email";
import { sendGuestConfirmationSms, sendHostNotificationSms } from "@/lib/sms";
import { fireWebhook } from "@/lib/webhook";
import { isRateLimited } from "@/lib/rate-limit";

function genId() {
  return crypto.randomUUID();
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`booking:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const { slotISO, guestName, guestEmail, notes, guestTimezone, guestPhone } = body;

  if (!slotISO || !guestName || !guestEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile || !profile.bookingEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const startsAt = new Date(slotISO);
  const duration = profile.bookingDuration ?? 30;
  const buffer = profile.bookingBuffer ?? 0;
  const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
  const hostTz = profile.bookingTimezone || "UTC";

  const date = startsAt.toLocaleDateString("sv-SE", { timeZone: hostTz });
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);
  const id = genId();

  // Check if shared group calendar is active
  const groupId = profile.bookingGroupId || "";
  let acceptedMembers: { profileId: number }[] = [];

  if (groupId) {
    const group = await db.select().from(groups).where(
      and(eq(groups.id, groupId), eq(groups.profileId, profile.id))
    );
    if (group.length > 0) {
      acceptedMembers.push({ profileId: profile.id });
      const members = await db.select().from(groupMembers).where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "accepted"))
      );
      members.forEach((m) => acceptedMembers.push({ profileId: m.memberProfileId }));
    }
  }

  const isGroupMode = acceptedMembers.length > 0;
  let assignedProfileId: number | null = null;
  let assignedProfile: { name: string; bookingEmail: string; bookingSmsNumber: string; bookingTimezone: string } | null = null;

  if (isGroupMode) {
    // Build per-member slot info
    const memberSlotInfos: GroupMemberSlotInfo[] = [];

    for (const member of acceptedMembers) {
      // Skip members who blocked this date
      const memberBlocked = await db.select().from(blockedDates).where(
        and(eq(blockedDates.profileId, member.profileId), eq(blockedDates.date, date))
      );
      if (memberBlocked.length > 0) continue;

      const memberProfileRows = await db.select().from(profiles).where(eq(profiles.id, member.profileId));
      const memberProfile = memberProfileRows[0] ?? null;

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
        timezone: memberProfile?.bookingTimezone || hostTz,
      });
    }

    const groupSlots = generateGroupSlots(date, memberSlotInfos, duration, buffer);
    const matchingSlot = groupSlots.find((s) => s.startsAt.getTime() === startsAt.getTime());
    if (!matchingSlot || matchingSlot.availableProfileIds.length === 0) {
      return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    }

    // Count bookings per member for assignment
    const bookingCounts = new Map<number, number>();
    for (const member of acceptedMembers) {
      const count = await db.select().from(bookings).where(
        and(
          eq(bookings.profileId, profile.id),
          eq(bookings.assignedMemberProfileId, member.profileId),
          eq(bookings.status, "confirmed"),
        )
      );
      bookingCounts.set(member.profileId, count.length);
    }

    const strategy = (profile.bookingStrategy as "least-busy" | "round-robin") || "least-busy";
    assignedProfileId = pickGroupMember(matchingSlot.availableProfileIds, strategy, bookingCounts);

    await db.insert(bookings).values({
      id,
      profileId: profile.id,
      assignedMemberProfileId: assignedProfileId,
      guestName,
      guestEmail,
      startsAt,
      endsAt,
      notes: notes || "",
      status: "confirmed",
      guestTimezone: guestTimezone || "UTC",
      guestPhone: guestPhone || "",
    });

    const ap = await db.select().from(profiles).where(eq(profiles.id, assignedProfileId));
    if (ap[0]) {
      assignedProfile = {
        name: ap[0].name,
        bookingEmail: ap[0].bookingEmail,
        bookingSmsNumber: ap[0].bookingSmsNumber,
        bookingTimezone: ap[0].bookingTimezone,
      };
    }
  } else {
    // Solo booking — check if date is blocked
    const isBlocked = await db.select().from(blockedDates).where(
      and(eq(blockedDates.profileId, profile.id), eq(blockedDates.date, date))
    );
    if (isBlocked.length > 0) {
      return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    }

    // Validate slot
    const [windows, existing] = await Promise.all([
      db.select().from(availability).where(eq(availability.profileId, profile.id)),
      db.select().from(bookings).where(
        and(
          eq(bookings.profileId, profile.id),
          eq(bookings.status, "confirmed"),
          gte(bookings.startsAt, dayStart),
          lte(bookings.startsAt, dayEnd)
        )
      ),
    ]);

    const availableSlots = generateSlots(
      date,
      windows,
      existing.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
      duration,
      buffer,
      hostTz
    );

    const isValid = availableSlots.some((s) => s.getTime() === startsAt.getTime());
    if (!isValid) {
      return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    }

    await db.insert(bookings).values({
      id,
      profileId: profile.id,
      guestName,
      guestEmail,
      startsAt,
      endsAt,
      notes: notes || "",
      status: "confirmed",
      guestTimezone: guestTimezone || "UTC",
      guestPhone: guestPhone || "",
    });
  }

  // Send notifications
  const hostName = assignedProfile?.name || profile.name || username;
  const hostEmail = assignedProfile?.bookingEmail || profile.bookingEmail || "";
  const hostSmsNumber = assignedProfile?.bookingSmsNumber || profile.bookingSmsNumber || "";

  const emailData = {
    guestName,
    guestEmail,
    hostName,
    hostEmail,
    title: profile.bookingTitle || "Book a call",
    startsAt,
    endsAt,
    guestTimezone: guestTimezone || "UTC",
    hostTimezone: hostTz,
    notes,
  };

  const smsData = {
    guestName,
    guestPhone: guestPhone || "",
    hostName,
    hostSmsNumber,
    title: profile.bookingTitle || "Book a call",
    startsAt,
    guestTimezone: guestTimezone || "UTC",
    hostTimezone: hostTz,
  };

  await Promise.all([
    sendGuestConfirmation(emailData),
    sendHostNotification(emailData),
    sendGuestConfirmationSms(smsData),
    sendHostNotificationSms(smsData),
    startsAt.getTime() - Date.now() > 25 * 3600 * 1000
      ? sendGuestReminder(emailData, new Date(startsAt.getTime() - 24 * 3600 * 1000))
      : Promise.resolve(),
    startsAt.getTime() - Date.now() > 70 * 60 * 1000
      ? sendGuestReminder(emailData, new Date(startsAt.getTime() - 60 * 60 * 1000))
      : Promise.resolve(),
  ]);

  const webhookUrl = profile.webhookUrl;
  if (webhookUrl) {
    after(() =>
      fireWebhook(webhookUrl, "booking.created", {
        username: profile.username,
        id,
        guestName,
        guestEmail,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        notes: notes || "",
        assignedTo: assignedProfile?.name || null,
      })
    );
  }

  return NextResponse.json({ ok: true, id });

  } catch (err: any) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
