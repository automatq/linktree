import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, campaigns, emailTemplates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ campaigns: [] });

  const rows = await db
    .select({
      id: campaigns.id,
      templateId: campaigns.templateId,
      name: campaigns.name,
      type: campaigns.type,
      audienceFilter: campaigns.audienceFilter,
      status: campaigns.status,
      triggerType: campaigns.triggerType,
      triggerDelayMinutes: campaigns.triggerDelayMinutes,
      totalRecipients: campaigns.totalRecipients,
      totalSent: campaigns.totalSent,
      scheduledAt: campaigns.scheduledAt,
      sentAt: campaigns.sentAt,
      createdAt: campaigns.createdAt,
      templateName: emailTemplates.name,
    })
    .from(campaigns)
    .leftJoin(emailTemplates, eq(campaigns.templateId, emailTemplates.id))
    .where(eq(campaigns.profileId, profile.id))
    .orderBy(desc(campaigns.createdAt));

  return NextResponse.json({ campaigns: rows });
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
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const id = crypto.randomUUID();
    await db.insert(campaigns).values({
      id,
      profileId: profile.id,
      templateId: body.templateId || null,
      name,
      type: body.type === "automation" ? "automation" : "broadcast",
      audienceFilter: body.audienceFilter || '{"source":"all"}',
      status: body.type === "automation" ? "paused" : "draft",
      triggerType: body.triggerType || "",
      triggerDelayMinutes: body.triggerDelayMinutes ? parseInt(body.triggerDelayMinutes) : 0,
    });

    return NextResponse.json({ ok: true, campaignId: id });
  }

  if (action === "update") {
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = (body.name || "").trim().slice(0, 100);
    if (body.templateId !== undefined) updates.templateId = body.templateId || null;
    if (body.audienceFilter !== undefined) updates.audienceFilter = body.audienceFilter;
    if (body.triggerType !== undefined) updates.triggerType = body.triggerType;
    if (body.triggerDelayMinutes !== undefined) updates.triggerDelayMinutes = parseInt(body.triggerDelayMinutes) || 0;
    if (body.status !== undefined) {
      // Only allow toggling automation active/paused
      if (["active", "paused"].includes(body.status)) updates.status = body.status;
    }

    await db
      .update(campaigns)
      .set(updates)
      .where(and(eq(campaigns.id, body.campaignId), eq(campaigns.profileId, profile.id)));

    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, body.campaignId), eq(campaigns.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
