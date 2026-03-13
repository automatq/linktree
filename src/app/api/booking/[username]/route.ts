import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { profiles, availability, bookings } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { generateSlots } from "@/lib/slots";
import { sendGuestConfirmation, sendHostNotification, sendGuestReminder } from "@/lib/email";
import { sendGuestConfirmationSms, sendHostNotificationSms } from "@/lib/sms";
import { fireWebhook } from "@/lib/webhook";
import { isRateLimited } from "@/lib/rate-limit";

function genId() {
  return crypto.randomUUID();
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
  const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
  const hostTz = profile.bookingTimezone || "UTC";

  // Validate the slot is still available
  const date = startsAt.toLocaleDateString("sv-SE", { timeZone: hostTz }); // "YYYY-MM-DD"
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

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
    profile.bookingBuffer ?? 0,
    hostTz
  );

  const isValid = availableSlots.some((s) => s.getTime() === startsAt.getTime());
  if (!isValid) {
    return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
  }

  const id = genId();
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

  // Send emails
  const emailData = {
    guestName,
    guestEmail,
    hostName: profile.name || username,
    hostEmail: profile.bookingEmail || "",
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
    hostName: profile.name || username,
    hostSmsNumber: profile.bookingSmsNumber || "",
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
    // Schedule 24h reminder if the call is more than 25 hours away
    startsAt.getTime() - Date.now() > 25 * 3600 * 1000
      ? sendGuestReminder(emailData, new Date(startsAt.getTime() - 24 * 3600 * 1000))
      : Promise.resolve(),
    // Schedule 1h reminder if the call is more than 70 min away
    startsAt.getTime() - Date.now() > 70 * 60 * 1000
      ? sendGuestReminder(emailData, new Date(startsAt.getTime() - 60 * 60 * 1000))
      : Promise.resolve(),
  ]);

  // Fire webhook after response — no latency impact
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
      })
    );
  }

  return NextResponse.json({ ok: true, id });
}
