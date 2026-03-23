import { Resend } from "resend";
import { db } from "@/db";
import { subscribers, bookings, orders, unsubscribes, campaignSends, campaigns } from "@/db/schema";
import { eq, and, gte, notInArray, sql } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Campaign utilities ──────────────────────────────────────────────────────

/** Replace {{var}} placeholders with values */
export function interpolateTemplate(
  html: string,
  vars: Record<string, string>,
): string {
  let result = html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
  // Auto-append unsubscribe footer if not already present
  if (!html.includes("{{unsubscribe_url}}") && vars.unsubscribe_url) {
    result += `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center"><a href="${vars.unsubscribe_url}" style="color:#888;font-size:12px;text-decoration:underline">Unsubscribe</a></div>`;
  }
  return result;
}

type AudienceFilter = {
  source: "all" | "subscribers" | "bookings" | "orders";
  withinDays?: number;
};

type Recipient = { email: string; name: string };

/** Resolve deduplicated recipients for a campaign audience filter */
export async function resolveAudience(
  profileId: number,
  filter: AudienceFilter,
): Promise<Recipient[]> {
  const seen = new Map<string, string>(); // email -> name

  const cutoff = filter.withinDays
    ? new Date(Date.now() - filter.withinDays * 24 * 60 * 60 * 1000)
    : null;

  // Subscribers
  if (filter.source === "all" || filter.source === "subscribers") {
    const conds = [eq(subscribers.profileId, profileId)];
    if (cutoff) conds.push(gte(subscribers.subscribedAt, cutoff));
    const rows = await db
      .select({ email: subscribers.email, name: subscribers.name })
      .from(subscribers)
      .where(and(...conds));
    for (const r of rows) {
      if (!seen.has(r.email)) seen.set(r.email, r.name || "");
    }
  }

  // Booking guests
  if (filter.source === "all" || filter.source === "bookings") {
    const conds = [eq(bookings.profileId, profileId)];
    if (cutoff) conds.push(gte(bookings.createdAt, cutoff));
    const rows = await db
      .select({ email: bookings.guestEmail, name: bookings.guestName })
      .from(bookings)
      .where(and(...conds));
    for (const r of rows) {
      if (!seen.has(r.email)) seen.set(r.email, r.name || "");
    }
  }

  // Store customers
  if (filter.source === "all" || filter.source === "orders") {
    const conds = [eq(orders.profileId, profileId), eq(orders.status, "paid")];
    if (cutoff) conds.push(gte(orders.createdAt, cutoff));
    const rows = await db
      .select({ email: orders.guestEmail, name: orders.guestName })
      .from(orders)
      .where(and(...conds));
    for (const r of rows) {
      if (!seen.has(r.email)) seen.set(r.email, r.name || "");
    }
  }

  // Exclude unsubscribes
  const unsubs = await db
    .select({ email: unsubscribes.email })
    .from(unsubscribes)
    .where(eq(unsubscribes.profileId, profileId));
  const unsubSet = new Set(unsubs.map((u) => u.email));

  const recipients: Recipient[] = [];
  for (const [email, name] of seen) {
    if (!unsubSet.has(email)) {
      recipients.push({ email, name });
    }
  }

  return recipients;
}

/** Send campaign emails in batches of 100 via Resend */
export async function sendCampaignBatch(
  campaignId: string,
  profileId: number,
  recipients: Recipient[],
  subject: string,
  bodyHtml: string,
  username: string,
): Promise<{ sent: number; failed: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: 0 };

  let totalSent = 0;
  let totalFailed = 0;
  const chunkSize = 100;

  for (let i = 0; i < recipients.length; i += chunkSize) {
    const chunk = recipients.slice(i, i + chunkSize);

    const emailBatch = chunk.map((r) => {
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/unsubscribe/${username}?email=${encodeURIComponent(r.email)}`;
      const html = interpolateTemplate(bodyHtml, {
        name: r.name || "there",
        email: r.email,
        unsubscribe_url: unsubscribeUrl,
      });
      const subj = interpolateTemplate(subject, {
        name: r.name || "there",
        email: r.email,
      });
      return {
        from: fromAddress(username),
        to: r.email,
        subject: subj,
        html,
      };
    });

    try {
      const result = await (resend.batch as any).send(emailBatch);
      const ids: string[] = result?.data?.data?.map((d: any) => d.id) || [];

      // Update send rows
      for (let j = 0; j < chunk.length; j++) {
        await db
          .update(campaignSends)
          .set({
            status: "sent",
            resendEmailId: ids[j] || null,
            sentAt: new Date(),
          })
          .where(
            and(
              eq(campaignSends.campaignId, campaignId),
              eq(campaignSends.recipientEmail, chunk[j].email),
            ),
          );
      }
      totalSent += chunk.length;
    } catch (err) {
      console.error("Campaign batch send failed:", err);
      // Mark chunk as failed
      for (const r of chunk) {
        await db
          .update(campaignSends)
          .set({ status: "failed" })
          .where(
            and(
              eq(campaignSends.campaignId, campaignId),
              eq(campaignSends.recipientEmail, r.email),
            ),
          );
      }
      totalFailed += chunk.length;
    }
  }

  // Update campaign totals
  await db
    .update(campaigns)
    .set({
      totalSent,
      status: "sent",
      sentAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  return { sent: totalSent, failed: totalFailed };
}

export type BookingEmailData = {
  username: string; // host's username for from address
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

function fromAddress(username: string): string {
  return `${username}@axiomflow.ca`;
}

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
    from: fromAddress(data.username),
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
    from: fromAddress(data.username),
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

export async function sendGuestReminder(data: BookingEmailData, scheduledAt: Date): Promise<string | null> {
  if (!process.env.RESEND_API_KEY) return null;

  const dateStr = formatDateTime(data.startsAt, data.guestTimezone);

  try {
    const result = await resend.emails.send({
      from: fromAddress(data.username),
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
    } as Parameters<typeof resend.emails.send>[0]);
    return (result as any)?.data?.id ?? null;
  } catch (err) {
    console.error("Email send failed:", err);
    return null;
  }
}

export async function sendHostReminder(data: BookingEmailData, scheduledAt: Date): Promise<string | null> {
  if (!process.env.RESEND_API_KEY || !data.hostEmail) return null;

  const dateStr = formatDateTime(data.startsAt, data.hostTimezone);

  try {
    const result = await resend.emails.send({
      from: fromAddress(data.username),
      to: data.hostEmail,
      subject: `Reminder: ${data.guestName} — call coming up`,
      scheduledAt: scheduledAt.toISOString(),
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
          <h2 style="margin:0 0 8px">Call reminder 🔔</h2>
          <p style="color:#555;margin:0 0 24px">You have an upcoming call with ${data.guestName}.</p>

          <div style="background:#f9f9f9;border-radius:8px;padding:20px">
            <div style="margin-bottom:12px">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">Guest</div>
              <div style="font-weight:600">${data.guestName}</div>
              <div style="color:#555;font-size:14px">${data.guestEmail}</div>
            </div>
            <div>
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">When</div>
              <div style="font-weight:600">${dateStr}</div>
            </div>
          </div>
        </div>
      `,
    } as Parameters<typeof resend.emails.send>[0]);
    return (result as any)?.data?.id ?? null;
  } catch (err) {
    console.error("Email send failed:", err);
    return null;
  }
}
