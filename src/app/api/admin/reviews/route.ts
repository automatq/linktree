import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, reviews } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const authorProfiles = profiles;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ reviews: [], reviewsEnabled: false });

  const allReviews = await db
    .select({
      id: reviews.id,
      recommend: reviews.recommend,
      audioUrl: reviews.audioUrl,
      audioDuration: reviews.audioDuration,
      text: reviews.text,
      photos: reviews.photos,
      verifiedClient: reviews.verifiedClient,
      response: reviews.response,
      hidden: reviews.hidden,
      createdAt: reviews.createdAt,
      authorUsername: authorProfiles.username,
      authorName: authorProfiles.name,
    })
    .from(reviews)
    .innerJoin(authorProfiles, eq(reviews.authorProfileId, authorProfiles.id))
    .where(eq(reviews.profileId, profile.id))
    .orderBy(desc(reviews.createdAt));

  const visible = allReviews.filter((r) => !r.hidden);
  const total = visible.length;
  const recommended = visible.filter((r) => r.recommend).length;

  return NextResponse.json({
    reviews: allReviews.map((r) => ({
      id: r.id,
      recommend: r.recommend,
      audioUrl: r.audioUrl,
      audioDuration: r.audioDuration,
      text: r.text,
      verifiedClient: r.verifiedClient,
      response: r.response,
      hidden: r.hidden,
      createdAt: r.createdAt?.toISOString(),
      authorUsername: r.authorUsername,
      authorName: r.authorName,
    })),
    reviewsEnabled: profile.reviewsEnabled,
    stats: total > 0 ? { total, recommended, percentage: Math.round((recommended / total) * 100) } : null,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  // Toggle reviews enabled
  if (action === "settings") {
    await db.update(profiles).set({ reviewsEnabled: body.reviewsEnabled }).where(eq(profiles.userId, userId));
    return NextResponse.json({ ok: true });
  }

  // Respond to a review (creator's public response)
  if (action === "respond") {
    const response = (body.response || "").trim().slice(0, 500);
    await db.update(reviews).set({
      response,
      respondedAt: new Date(),
    }).where(and(eq(reviews.id, body.reviewId), eq(reviews.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
