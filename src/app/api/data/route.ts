import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, links, socialLinks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (!profile) {
    return NextResponse.json({
      profile: { name: "", username: "", bio: "", avatarInitials: "", avatarUrl: "", font: "mono", cardStyle: "minimal" },
      links: [],
      socialLinks: [],
    });
  }

  const [userLinks, userSocials] = await Promise.all([
    db.select().from(links).where(eq(links.profileId, profile.id)).orderBy(asc(links.position)),
    db.select().from(socialLinks).where(eq(socialLinks.profileId, profile.id)).orderBy(asc(socialLinks.position)),
  ]);

  return NextResponse.json({
    profile: {
      name: profile.name,
      username: profile.username,
      bio: profile.bio,
      avatarInitials: profile.avatarInitials,
      avatarUrl: profile.avatarUrl,
      font: profile.font,
      cardStyle: profile.cardStyle,
      cardSize: profile.cardSize,
      accentColor: profile.accentColor,
      bgType: profile.bgType,
      bgValue: profile.bgValue,
      stripeAccountId: profile.stripeAccountId,
      stripePublishableKey: profile.stripePublishableKey,
      emailCaptureEnabled: profile.emailCaptureEnabled,
      emailCaptureTitle: profile.emailCaptureTitle,
      emailCaptureButtonText: profile.emailCaptureButtonText,
      bookingEnabled: profile.bookingEnabled,
      bookingTitle: profile.bookingTitle,
      bookingDuration: profile.bookingDuration,
      bookingBuffer: profile.bookingBuffer,
      bookingAdvanceDays: profile.bookingAdvanceDays,
      bookingEmail: profile.bookingEmail,
      bookingTimezone: profile.bookingTimezone,
      bookingSmsNumber: profile.bookingSmsNumber,
      socialLinksPosition: profile.socialLinksPosition as "footer" | "bio",
      customDomain: profile.customDomain,
      tipJarEnabled: profile.tipJarEnabled,
      tipJarTitle: profile.tipJarTitle,
      tipJarAmounts: profile.tipJarAmounts,
      metaPixelId: profile.metaPixelId,
      tiktokPixelId: profile.tiktokPixelId,
      googleTagId: profile.googleTagId,
      webhookUrl: profile.webhookUrl,
      heroEnabled: profile.heroEnabled,
      heroImageUrl: profile.heroImageUrl,
      heroHeadline: profile.heroHeadline,
      heroSubtitle: profile.heroSubtitle,
      heroCtaText: profile.heroCtaText,
      heroCtaUrl: profile.heroCtaUrl,
      contactFormEnabled: profile.contactFormEnabled,
      contactFormTitle: profile.contactFormTitle,
      contactFormEmail: profile.contactFormEmail,
      contactFormSmsNumber: profile.contactFormSmsNumber,
      galleryEnabled: profile.galleryEnabled,
      galleryTitle: profile.galleryTitle,
      galleryColumns: profile.galleryColumns,
      groupsEnabled: profile.groupsEnabled,
      reviewsEnabled: profile.reviewsEnabled,
      voiceRoomsEnabled: profile.voiceRoomsEnabled,
      wallEnabled: profile.wallEnabled,
      wallTitle: profile.wallTitle,
      wallMaxNotes: profile.wallMaxNotes,
    },
    links: userLinks.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      url: l.url,
      icon: l.icon,
      type: l.type,
      startsAt: l.startsAt ? l.startsAt.toISOString() : null,
      endsAt: l.endsAt ? l.endsAt.toISOString() : null,
    })),
    socialLinks: userSocials.map((s) => ({
      platform: s.platform,
      url: s.url,
      icon: s.icon,
    })),
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { profile: profileData, links: linksData, socialLinks: socialsData } = body;

  // Upsert profile
  let profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (!profile) {
    const [created] = await db.insert(profiles).values({
      userId,
      username: profileData.username?.toLowerCase().replace(/[^a-z0-9_-]/g, "") || userId.slice(0, 12),
      name: profileData.name,
      bio: profileData.bio,
      avatarInitials: profileData.avatarInitials,
      avatarUrl: profileData.avatarUrl || "",
      font: profileData.font || "mono",
      cardStyle: profileData.cardStyle || "minimal",
      cardSize: profileData.cardSize || "md",
      accentColor: profileData.accentColor || "",
      bgType: profileData.bgType || "none",
      bgValue: profileData.bgValue || "",
      socialLinksPosition: profileData.socialLinksPosition || "footer",
    }).returning();
    profile = created;
  } else {
    const [updated] = await db.update(profiles)
      .set({
        name: profileData.name,
        bio: profileData.bio,
        avatarInitials: profileData.avatarInitials,
        avatarUrl: profileData.avatarUrl || "",
        font: profileData.font || "mono",
        cardStyle: profileData.cardStyle || "minimal",
        cardSize: profileData.cardSize || "md",
        accentColor: profileData.accentColor || "",
        bgType: profileData.bgType || "none",
        bgValue: profileData.bgValue || "",
        socialLinksPosition: profileData.socialLinksPosition || "footer",
      })
      .where(eq(profiles.userId, userId))
      .returning();
    profile = updated;
  }

  // Replace links
  await db.delete(links).where(eq(links.profileId, profile.id));
  if (linksData.length > 0) {
    await db.insert(links).values(
      linksData.map((l: { id: string; title: string; description: string; url: string; icon: string; type?: string; startsAt?: string | null; endsAt?: string | null }, i: number) => ({
        id: l.id,
        profileId: profile!.id,
        title: l.title,
        description: l.description || "",
        url: (l.type === "header" || l.type === "booking") ? "" : (l.url || ""),
        icon: (l.type === "header" || l.type === "embed" || l.type === "booking" || l.type === "countdown" || l.type === "rss") ? "" : (l.icon || "globe"),
        position: i,
        type: l.type || "link",
        startsAt: l.startsAt ? new Date(l.startsAt) : null,
        endsAt: l.endsAt ? new Date(l.endsAt) : null,
      }))
    );
  }

  // Replace social links
  await db.delete(socialLinks).where(eq(socialLinks.profileId, profile.id));
  if (socialsData.length > 0) {
    await db.insert(socialLinks).values(
      socialsData.map((s: { platform: string; url: string; icon: string }, i: number) => ({
        profileId: profile!.id,
        platform: s.platform,
        url: s.url,
        icon: s.icon,
        position: i,
      }))
    );
  }

  return NextResponse.json({ ok: true, username: profile.username });
}
