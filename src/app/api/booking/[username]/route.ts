import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { profiles, availability, bookings, teamMembers, teamAvailability } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { generateSlots, generateTeamSlots, pickTeamMember } from "@/lib/slots";
import type { TeamMemberSlotInfo } from "@/lib/slots";
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

  // Rate limit: 5 booking attempts per IP per 15 minutes
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

  const date = startsAt.toLocaleDateString("sv-SE", { timeZone: hostTz }); // "YYYY-MM-DD"
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);
  const id = genId();

  // Check if team mode
  const activeMembers = profile.teamBookingEnabled
    ? await db.select().from(teamMembers).where(
        and(eq(teamMembers.profileId, profile.id), eq(teamMembers.status, "active"))
      )
    : [];

  const isTeamMode = profile.teamBookingEnabled && activeMembers.length > 0;

  let assignedMemberId: string | null = null;
  let assignedMember: typeof activeMembers[0] | null = null;

  if (isTeamMode) {
    // Team booking — validate slot and assign member atomically
    const result = await db.transaction(async (tx) => {
      // Load per-member availability and bookings
      const memberSlotInfos: TeamMemberSlotInfo[] = [];

      for (const member of activeMembers) {
        const [memberWindows, memberBookings] = await Promise.all([
          tx.select().from(teamAvailability).where(eq(teamAvailability.teamMemberId, member.id)),
          tx.select().from(bookings).where(
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
          timezone: member.timezone || hostTz,
        });
      }

      const teamSlots = generateTeamSlots(date, memberSlotInfos, duration, buffer);
      const matchingSlot = teamSlots.find((s) => s.startsAt.getTime() === startsAt.getTime());
      if (!matchingSlot || matchingSlot.availableMembers.length === 0) return null;

      // Count bookings per member for assignment strategy
      const bookingCounts = new Map<string, number>();
      for (const member of activeMembers) {
        const count = await tx.select().from(bookings).where(
          and(
            eq(bookings.profileId, profile.id),
            eq(bookings.teamMemberId, member.id),
            eq(bookings.status, "confirmed"),
          )
        );
        bookingCounts.set(member.id, count.length);
      }

      const strategy = (profile.teamBookingStrategy as "least-busy" | "round-robin") || "least-busy";
      const pickedMemberId = pickTeamMember(matchingSlot.availableMembers, strategy, bookingCounts);

      await tx.insert(bookings).values({
        id,
        profileId: profile.id,
        teamMemberId: pickedMemberId,
        guestName,
        guestEmail,
        startsAt,
        endsAt,
        notes: notes || "",
        status: "confirmed",
        guestTimezone: guestTimezone || "UTC",
        guestPhone: guestPhone || "",
      });

      return pickedMemberId;
    });

    if (!result) {
      return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    }

    assignedMemberId = result;
    assignedMember = activeMembers.find((m) => m.id === assignedMemberId) || null;
  } else {
    // Solo booking — existing logic
    const inserted = await db.transaction(async (tx) => {
      const [windows, existing] = await Promise.all([
        tx.select().from(availability).where(eq(availability.profileId, profile.id)),
        tx.select().from(bookings).where(
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
      if (!isValid) return false;

      await tx.insert(bookings).values({
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

      return true;
    });

    if (!inserted) {
      return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    }
  }

  // Send notifications — use assigned member's contact info if team mode
  const hostName = assignedMember?.name || profile.name || username;
  const hostEmail = assignedMember?.email || profile.bookingEmail || "";
  const hostSmsNumber = assignedMember?.smsNumber || profile.bookingSmsNumber || "";

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

  // Fire webhook
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
        assignedTo: assignedMember?.name || null,
      })
    );
  }

  return NextResponse.json({ ok: true, id });
}
