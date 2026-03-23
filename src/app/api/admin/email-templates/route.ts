import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, emailTemplates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ templates: [] });

  const templates = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.profileId, profile.id))
    .orderBy(desc(emailTemplates.createdAt));

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const name = (body.name || "").trim().slice(0, 100);
    const subject = (body.subject || "").trim().slice(0, 200);
    const bodyHtml = (body.bodyHtml || "").trim();

    if (!name || !subject) {
      return NextResponse.json({ error: "Name and subject required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date();
    await db.insert(emailTemplates).values({
      id,
      profileId: profile.id,
      name,
      subject,
      bodyHtml,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      ok: true,
      template: { id, name, subject, bodyHtml, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    });
  }

  if (action === "update") {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = (body.name || "").trim().slice(0, 100);
    if (body.subject !== undefined) updates.subject = (body.subject || "").trim().slice(0, 200);
    if (body.bodyHtml !== undefined) updates.bodyHtml = body.bodyHtml;

    await db
      .update(emailTemplates)
      .set(updates)
      .where(and(eq(emailTemplates.id, body.templateId), eq(emailTemplates.profileId, profile.id)));

    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    await db
      .delete(emailTemplates)
      .where(and(eq(emailTemplates.id, body.templateId), eq(emailTemplates.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
