import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, campaigns, campaignSends, emailTemplates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveAudience, sendCampaignBatch } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // Rate limit: max 5 campaign sends per hour
  if (isRateLimited(`campaign-send:${profile.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many sends — try again later" }, { status: 429 });
  }

  const { campaignId } = await req.json();
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Fetch campaign
  const campaign = await db.query.campaigns.findFirst({
    where: and(eq(campaigns.id, campaignId), eq(campaigns.profileId, profile.id)),
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Campaign already sent or in progress" }, { status: 400 });
  }
  if (!campaign.templateId) {
    return NextResponse.json({ error: "No template selected" }, { status: 400 });
  }

  // Fetch template
  const template = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.id, campaign.templateId),
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  // Resolve audience
  let filter;
  try {
    filter = JSON.parse(campaign.audienceFilter);
  } catch {
    filter = { source: "all" };
  }

  const recipients = await resolveAudience(profile.id, filter);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  // Set campaign to sending
  await db
    .update(campaigns)
    .set({ status: "sending", totalRecipients: recipients.length })
    .where(eq(campaigns.id, campaignId));

  // Create queued send rows
  const sendRows = recipients.map((r) => ({
    id: crypto.randomUUID(),
    campaignId,
    profileId: profile.id,
    recipientEmail: r.email,
    recipientName: r.name,
    status: "queued" as const,
  }));

  // Insert in chunks to avoid query size limits
  for (let i = 0; i < sendRows.length; i += 500) {
    await db.insert(campaignSends).values(sendRows.slice(i, i + 500));
  }

  // Send the emails
  const result = await sendCampaignBatch(
    campaignId,
    profile.id,
    recipients,
    template.subject,
    template.bodyHtml,
    profile.username,
  );

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    failed: result.failed,
    total: recipients.length,
  });
}
