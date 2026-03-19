import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, bookings, pendingReminders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (status !== "confirmed" && status !== "cancelled") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.update(bookings)
    .set({ status })
    .where(and(eq(bookings.id, id), eq(bookings.profileId, profile.id)));

  // If cancelling, cancel all pending reminders
  if (status === "cancelled") {
    const pending = await db.select().from(pendingReminders).where(
      eq(pendingReminders.bookingId, id)
    );

    // Cancel scheduled Resend emails
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      for (const r of pending) {
        if (r.resendEmailId && !r.sent) {
          try { await resend.emails.cancel(r.resendEmailId); } catch {}
        }
      }
    }

    // Delete all pending reminders for this booking
    await db.delete(pendingReminders).where(eq(pendingReminders.bookingId, id));
  }

  return NextResponse.json({ ok: true });
}
