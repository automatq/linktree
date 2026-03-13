import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile || !profile.contactFormEnabled || !profile.contactFormEmail) {
    return NextResponse.json({ error: "Contact form not available" }, { status: 404 });
  }

  const body = await req.json();
  const { name, email, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  try {
    await resend.emails.send({
      from: "Contact Form <bookings@resend.dev>",
      to: profile.contactFormEmail,
      replyTo: email.trim(),
      subject: `New message from ${name.trim()} via TriLink`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
          <h2 style="margin:0 0 8px">New contact message</h2>
          <p style="color:#555;margin:0 0 24px">Someone reached out through your TriLink profile.</p>

          <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px">
            <div style="margin-bottom:12px">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">From</div>
              <div style="font-weight:600">${name.trim()}</div>
              <div style="color:#555;font-size:14px">${email.trim()}</div>
            </div>
            <div>
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px">Message</div>
              <div style="color:#333;white-space:pre-wrap;line-height:1.5">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            </div>
          </div>

          <p style="color:#888;font-size:13px">You can reply directly to this email to respond to ${name.trim()}.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
