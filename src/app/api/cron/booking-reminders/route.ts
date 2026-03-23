import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, profiles, pendingReminders } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { sendGuestReminder, sendHostReminder } from "@/lib/email";
import { sendGuestReminderSms, sendHostReminderSms } from "@/lib/sms";

function formatLabel(minutesBefore: number): string {
  if (minutesBefore >= 1440) return `in ${Math.round(minutesBefore / 1440)} day${minutesBefore >= 2880 ? "s" : ""}`;
  if (minutesBefore >= 60) return `in ${Math.round(minutesBefore / 60)} hour${minutesBefore >= 120 ? "s" : ""}`;
  return `in ${minutesBefore} minutes`;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let processed = 0;

  // Fetch unsent reminders whose sendAt time has passed (limit 100 per run)
  const pending = await db.select().from(pendingReminders).where(
    and(
      eq(pendingReminders.sent, false),
      lte(pendingReminders.sendAt, now)
    )
  );

  for (const reminder of pending.slice(0, 100)) {
    const booking = await db.select().from(bookings).where(eq(bookings.id, reminder.bookingId));
    if (!booking[0] || booking[0].status !== "confirmed") {
      // Booking cancelled or gone — mark as sent to skip
      await db.update(pendingReminders).set({ sent: true }).where(eq(pendingReminders.id, reminder.id));
      continue;
    }

    const profile = await db.select().from(profiles).where(eq(profiles.id, reminder.profileId));
    if (!profile[0]) continue;

    const b = booking[0];
    const p = profile[0];
    const label = formatLabel(reminder.minutesBefore);

    // Determine assigned member profile for group bookings
    let hostProfile = p;
    if (b.assignedMemberProfileId) {
      const assigned = await db.select().from(profiles).where(eq(profiles.id, b.assignedMemberProfileId));
      if (assigned[0]) hostProfile = assigned[0];
    }

    if (reminder.channel === "sms") {
      const smsData = {
        guestName: b.guestName,
        guestPhone: b.guestPhone || "",
        hostName: hostProfile.name || "",
        hostSmsNumber: hostProfile.bookingSmsNumber || "",
        title: p.bookingTitle || "Book a call",
        startsAt: b.startsAt,
        guestTimezone: b.guestTimezone || "UTC",
        hostTimezone: p.bookingTimezone || "UTC",
      };

      if (reminder.party === "guest") {
        await sendGuestReminderSms(smsData, label);
      } else {
        await sendHostReminderSms(smsData, label);
      }
    } else if (reminder.channel === "email") {
      // Email reminders that were too far out to schedule via Resend at booking time
      const emailData = {
        username: p.username,
        guestName: b.guestName,
        guestEmail: b.guestEmail,
        hostName: hostProfile.name || "",
        hostEmail: hostProfile.bookingEmail || "",
        title: p.bookingTitle || "Book a call",
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        guestTimezone: b.guestTimezone || "UTC",
        hostTimezone: p.bookingTimezone || "UTC",
        notes: b.notes,
      };

      // Try to schedule via Resend if the booking is within 72h, otherwise send immediately
      const hoursUntilBooking = (b.startsAt.getTime() - Date.now()) / 3600000;
      const scheduledAt = hoursUntilBooking <= 72 ? new Date(Math.max(Date.now() + 60000, reminder.sendAt.getTime())) : undefined;

      if (reminder.party === "guest") {
        await sendGuestReminder(emailData, scheduledAt || new Date());
      } else {
        await sendHostReminder(emailData, scheduledAt || new Date());
      }
    }

    await db.update(pendingReminders).set({ sent: true }).where(eq(pendingReminders.id, reminder.id));
    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}
