import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendContactFormSms } from "@/lib/sms";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile || !profile.contactFormEnabled) {
    return NextResponse.json({ error: "Contact form not available" }, { status: 404 });
  }

  // Need at least email OR SMS configured
  if (!profile.contactFormEmail && !profile.contactFormSmsNumber) {
    return NextResponse.json({ error: "Contact form not available" }, { status: 404 });
  }

  const body = await req.json();
  const { name, email, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Escape all user input for HTML email
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const escapedName = esc(trimmedName);
  const escapedEmail = esc(trimmedEmail);
  const escapedMessage = esc(trimmedMessage);

  // Send email + SMS in parallel, awaited to ensure delivery
  const promises: Promise<unknown>[] = [];

  if (profile.contactFormEmail && process.env.RESEND_API_KEY) {
    promises.push(
      resend.emails.send({
        from: "Contact Form <bookings@resend.dev>",
        to: profile.contactFormEmail,
        replyTo: trimmedEmail,
        subject: `New message from ${trimmedName} via TriLink`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
            <h2 style="margin:0 0 8px">New contact message</h2>
            <p style="color:#555;margin:0 0 24px">Someone reached out through your TriLink profile.</p>

            <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px">
              <div style="margin-bottom:12px">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">From</div>
                <div style="font-weight:600">${escapedName}</div>
                <div style="color:#555;font-size:14px">${escapedEmail}</div>
              </div>
              <div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">Message</div>
                <div style="color:#333;white-space:pre-wrap;line-height:1.5">${escapedMessage}</div>
              </div>
            </div>

            <p style="color:#888;font-size:13px">You can reply directly to this email to respond to ${escapedName}.</p>
          </div>
        `,
      }).catch((err) => console.error("Contact email failed:", err))
    );
  }

  if (profile.contactFormSmsNumber) {
    promises.push(
      sendContactFormSms(
        profile.contactFormSmsNumber,
        trimmedName,
        trimmedEmail,
        trimmedMessage,
      ).catch((err) => console.error("Contact SMS failed:", err))
    );
  }

  await Promise.all(promises);

  return NextResponse.json({ ok: true });
}
