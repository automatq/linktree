import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, profiles } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { sendGuestReminderSms, sendHostReminderSms } from "@/lib/sms";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 24h window: bookings starting 23h–25h from now (wide enough for a daily cron)
  const h24lo = new Date(now.getTime() + 23 * 3600 * 1000);
  const h24hi = new Date(now.getTime() + 25 * 3600 * 1000);

  const upcoming24 = await db.select().from(bookings).where(
    and(
      eq(bookings.status, "confirmed"),
      eq(bookings.smsReminder24hSent, false),
      gte(bookings.startsAt, h24lo),
      lte(bookings.startsAt, h24hi)
    )
  );

  let sent24 = 0;

  for (const booking of upcoming24) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, booking.profileId) });
    if (!profile) continue;

    const smsData = {
      guestName: booking.guestName,
      guestPhone: booking.guestPhone || "",
      hostName: profile.name || "",
      hostSmsNumber: profile.bookingSmsNumber || "",
      title: profile.bookingTitle || "Book a call",
      startsAt: booking.startsAt,
      guestTimezone: booking.guestTimezone || "UTC",
      hostTimezone: profile.bookingTimezone || "UTC",
    };

    await Promise.all([
      sendGuestReminderSms(smsData, "in 24 hours"),
      sendHostReminderSms(smsData, "in 24 hours"),
    ]);

    await db.update(bookings)
      .set({ smsReminder24hSent: true })
      .where(eq(bookings.id, booking.id));

    sent24++;
  }

  return NextResponse.json({ ok: true, sent24 });
}
