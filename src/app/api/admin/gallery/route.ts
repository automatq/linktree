import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, galleryImages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ images: [] });

  const images = await db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.profileId, profile.id))
    .orderBy(asc(galleryImages.position));

  return NextResponse.json({
    images: images.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      caption: img.caption,
      linkUrl: img.linkUrl,
      position: img.position,
    })),
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const { action, image, images: bulkImages, galleryEnabled, galleryTitle, galleryColumns } = body;

  // Save gallery settings
  if (action === "settings") {
    await db
      .update(profiles)
      .set({
        galleryEnabled: galleryEnabled ?? false,
        galleryTitle: galleryTitle ?? "Gallery",
        galleryColumns: galleryColumns ?? 3,
      })
      .where(eq(profiles.userId, userId));
    return NextResponse.json({ ok: true });
  }

  // Add a single image
  if (action === "add" && image) {
    const existing = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.profileId, profile.id));
    await db.insert(galleryImages).values({
      id: image.id,
      profileId: profile.id,
      imageUrl: image.imageUrl,
      caption: image.caption || "",
      linkUrl: image.linkUrl || "",
      position: existing.length,
    });
    return NextResponse.json({ ok: true });
  }

  // Delete a single image
  if (action === "delete" && image?.id) {
    await db.delete(galleryImages).where(eq(galleryImages.id, image.id));
    return NextResponse.json({ ok: true });
  }

  // Bulk update (reorder, captions, links)
  if (action === "bulk" && bulkImages) {
    // Delete all and re-insert in order
    await db.delete(galleryImages).where(eq(galleryImages.profileId, profile.id));
    if (bulkImages.length > 0) {
      await db.insert(galleryImages).values(
        bulkImages.map((img: { id: string; imageUrl: string; caption?: string; linkUrl?: string }, i: number) => ({
          id: img.id,
          profileId: profile.id,
          imageUrl: img.imageUrl,
          caption: img.caption || "",
          linkUrl: img.linkUrl || "",
          position: i,
        }))
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
