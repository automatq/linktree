import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, emailTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { interpolateTemplate } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { templateId, subject, bodyHtml } = await req.json();

  let subj = subject || "";
  let html = bodyHtml || "";

  // If templateId provided, use template content
  if (templateId) {
    const template = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, templateId),
    });
    if (template) {
      subj = template.subject;
      html = template.bodyHtml;
    }
  }

  // Render with sample data
  const sampleVars: Record<string, string> = {
    name: "Jane Smith",
    email: "jane@example.com",
    booking_date: "Monday, April 7, 2026 at 2:00 PM EST",
    booking_title: "Strategy Consultation",
    product_name: "Digital Marketing Guide",
    unsubscribe_url: "#",
  };

  const renderedSubject = interpolateTemplate(subj, sampleVars);
  const renderedHtml = interpolateTemplate(html, sampleVars);

  return NextResponse.json({ subject: renderedSubject, html: renderedHtml });
}
