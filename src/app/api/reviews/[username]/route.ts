import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, reviews, bookings, orders } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { put } from "@vercel/blob";
import { isRateLimited } from "@/lib/rate-limit";

const authorProfiles = profiles;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.reviewsEnabled) {
    return NextResponse.json({ reviews: [], stats: null });
  }

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
      respondedAt: reviews.respondedAt,
      hidden: reviews.hidden,
      createdAt: reviews.createdAt,
      authorUsername: authorProfiles.username,
      authorName: authorProfiles.name,
      authorAvatarUrl: authorProfiles.avatarUrl,
      authorAvatarInitials: authorProfiles.avatarInitials,
    })
    .from(reviews)
    .innerJoin(authorProfiles, eq(reviews.authorProfileId, authorProfiles.id))
    .where(and(eq(reviews.profileId, profile.id), eq(reviews.hidden, false)))
    .orderBy(desc(reviews.createdAt));

  const total = allReviews.length;
  const recommended = allReviews.filter((r) => r.recommend).length;

  return NextResponse.json({
    reviews: allReviews.map((r) => ({
      id: r.id,
      recommend: r.recommend,
      audioUrl: r.audioUrl,
      audioDuration: r.audioDuration,
      text: r.text,
      photos: JSON.parse(r.photos || "[]"),
      verifiedClient: r.verifiedClient,
      response: r.response,
      respondedAt: r.respondedAt?.toISOString(),
      createdAt: r.createdAt?.toISOString(),
      authorUsername: r.authorUsername,
      authorName: r.authorName,
      authorAvatarUrl: r.authorAvatarUrl,
      authorAvatarInitials: r.authorAvatarInitials,
    })),
    stats: total > 0 ? {
      total,
      recommended,
      percentage: Math.round((recommended / total) * 100),
    } : null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in to leave a review" }, { status: 401 });
  }

  const authorProfile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  if (!authorProfile) {
    return NextResponse.json({ error: "You need a profile to leave a review" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(`review:${ip}`, 2, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "You can only leave a couple reviews per hour" }, { status: 429 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.reviewsEnabled) {
    return NextResponse.json({ error: "Reviews not available" }, { status: 404 });
  }

  // Can't review yourself
  if (authorProfile.id === profile.id) {
    return NextResponse.json({ error: "You can't review yourself" }, { status: 400 });
  }

  // One review per person per profile — check for existing
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.profileId, profile.id), eq(reviews.authorProfileId, authorProfile.id)));
  if (existing.length > 0) {
    return NextResponse.json({ error: "You've already reviewed this profile. You can update your existing review." }, { status: 409 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  const recommend = formData.get("recommend") === "true";
  const text = ((formData.get("text") as string) || "").trim().slice(0, 500);
  const duration = parseInt((formData.get("duration") as string) || "0", 10);

  if (!audio) {
    return NextResponse.json({ error: "Voice review required" }, { status: 400 });
  }

  if (duration < 5) {
    return NextResponse.json({ error: "Review must be at least 5 seconds" }, { status: 400 });
  }

  if (duration > 60) {
    return NextResponse.json({ error: "Review can be up to 60 seconds" }, { status: 400 });
  }

  if (audio.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio file too large (max 5MB)" }, { status: 400 });
  }

  // Upload voice review
  const blob = await put(`reviews/${profile.id}-${Date.now()}.webm`, audio, {
    access: "public",
    allowOverwrite: true,
  });

  // Upload photos (up to 3)
  const photoUrls: string[] = [];
  for (let i = 0; i < 3; i++) {
    const photo = formData.get(`photo${i}`) as File | null;
    if (!photo) break;
    if (photo.size > 5 * 1024 * 1024) continue; // skip oversized
    const photoBlob = await put(`review-photos/${profile.id}-${Date.now()}-${i}.${photo.name.split(".").pop() || "jpg"}`, photo, {
      access: "public",
      allowOverwrite: true,
    });
    photoUrls.push(photoBlob.url);
  }

  // Check if verified client (has a booking or order with this profile)
  // We check by matching the author's email from Clerk against bookings/orders
  // For now, check if author has any booking or order on this profile
  const [authorBookings, authorOrders] = await Promise.all([
    db.select({ id: bookings.id }).from(bookings)
      .where(and(eq(bookings.profileId, profile.id), eq(bookings.guestEmail, authorProfile.username + "@check")))
      .limit(1),
    db.select({ id: orders.id }).from(orders)
      .where(and(eq(orders.profileId, profile.id), eq(orders.status, "paid")))
      .limit(1),
  ]);
  // For verified client, we'll check if there's any booking where the guest name matches
  // This is imperfect — a better approach would be to link orders/bookings to profileIds
  // For now, we'll set verifiedClient = false and can improve later
  const verifiedClient = false; // TODO: improve when bookings/orders track buyer profileId

  const id = crypto.randomUUID();
  await db.insert(reviews).values({
    id,
    profileId: profile.id,
    authorProfileId: authorProfile.id,
    recommend,
    audioUrl: blob.url,
    audioDuration: Math.min(duration, 60),
    text,
    photos: JSON.stringify(photoUrls),
    verifiedClient,
  });

  return NextResponse.json({
    ok: true,
    review: {
      id,
      recommend,
      audioUrl: blob.url,
      audioDuration: duration,
      text,
      photos: photoUrls,
      verifiedClient,
      response: "",
      createdAt: new Date().toISOString(),
      authorUsername: authorProfile.username,
      authorName: authorProfile.name,
      authorAvatarUrl: authorProfile.avatarUrl,
      authorAvatarInitials: authorProfile.avatarInitials,
    },
  });
}
