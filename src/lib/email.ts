import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type BookingEmailData = {
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  guestTimezone: string;
  hostTimezone: string;
  notes?: string;
  cancelUrl?: string;
};

function formatDateTime(date: Date, tz: string): string {
  return date.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatTime(date: Date, tz: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function sendGuestConfirmation(data: BookingEmailData) {
  if (!process.env.RESEND_API_KEY) return;

  const dateStr = formatDateTime(data.startsAt, data.guestTimezone);
  const endTimeStr = formatTime(data.endsAt, data.guestTimezone);

  await resend.emails.send({
    from: "Bookings <bookings@resend.dev>",
    to: data.guestEmail,
    subject: `Confirmed: ${data.title} with ${data.hostName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin:0 0 8px">Your booking is confirmed ✓</h2>
        <p style="color:#555;margin:0 0 24px">Here are the details for your upcoming call.</p>

        <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px">
          <div style="margin-bottom:12px">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">What</div>
            <div style="font-weight:600">${data.title}</div>
          </div>
          <div style="margin-bottom:12px">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">When</div>
            <div style="font-weight:600">${dateStr}</div>
            <div style="color:#555;font-size:14px">Ends at ${endTimeStr}</div>
          </div>
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">With</div>
            <div style="font-weight:600">${data.hostName}</div>
          </div>
          ${data.notes ? `<div style="margin-top:12px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">Your notes</div><div style="color:#555">${data.notes}</div></div>` : ""}
        </div>

        <p style="color:#888;font-size:13px">If you need to cancel, please reach out to ${data.hostEmail}.</p>
      </div>
    `,
  }).catch((err) => console.error("Email send failed:", err));
}

export async function sendHostNotification(data: BookingEmailData) {
  if (!process.env.RESEND_API_KEY || !data.hostEmail) return;

  const dateStr = formatDateTime(data.startsAt, data.hostTimezone);
  const endTimeStr = formatTime(data.endsAt, data.hostTimezone);

  await resend.emails.send({
    from: "Bookings <bookings@resend.dev>",
    to: data.hostEmail,
    subject: `New booking: ${data.guestName} — ${formatDateTime(data.startsAt, data.hostTimezone)}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin:0 0 8px">New booking 📅</h2>
        <p style="color:#555;margin:0 0 24px">${data.guestName} has booked a call with you.</p>

        <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px">
          <div style="margin-bottom:12px">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">Guest</div>
            <div style="font-weight:600">${data.guestName}</div>
            <div style="color:#555;font-size:14px">${data.guestEmail}</div>
          </div>
          <div style="margin-bottom:12px">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">When</div>
            <div style="font-weight:600">${dateStr}</div>
            <div style="color:#555;font-size:14px">Ends at ${endTimeStr}</div>
          </div>
          ${data.notes ? `<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">Their notes</div><div style="color:#555">${data.notes}</div></div>` : ""}
        </div>
      </div>
    `,
  }).catch((err) => console.error("Email send failed:", err));
}

export async function sendGuestReminder(data: BookingEmailData, scheduledAt: Date) {
  if (!process.env.RESEND_API_KEY) return;

  const dateStr = formatDateTime(data.startsAt, data.guestTimezone);

  await resend.emails.send({
    from: "Bookings <bookings@resend.dev>",
    to: data.guestEmail,
    subject: `Reminder: ${data.title} with ${data.hostName} is coming up`,
    scheduledAt: scheduledAt.toISOString(),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin:0 0 8px">Your call is coming up 🔔</h2>
        <p style="color:#555;margin:0 0 24px">Just a reminder about your upcoming call.</p>

        <div style="background:#f9f9f9;border-radius:8px;padding:20px">
          <div style="margin-bottom:12px">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">What</div>
            <div style="font-weight:600">${data.title}</div>
          </div>
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">When</div>
            <div style="font-weight:600">${dateStr}</div>
          </div>
        </div>
      </div>
    `,
  } as Parameters<typeof resend.emails.send>[0]).catch((err) => console.error("Email send failed:", err));
}
