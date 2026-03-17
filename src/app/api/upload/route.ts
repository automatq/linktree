import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

// Allowed MIME types per purpose
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"]);
const PRODUCT_FILE_TYPES = new Set([
  ...IMAGE_TYPES, "application/pdf", "application/zip",
  "application/x-zip-compressed", "video/mp4", "video/quicktime",
]);

const PURPOSE_CONFIG: Record<string, { folder: string; types: Set<string>; maxBytes: number }> = {
  avatar:        { folder: "avatars",        types: IMAGE_TYPES,        maxBytes: 5  * 1024 * 1024 },
  background:    { folder: "backgrounds",    types: IMAGE_TYPES,        maxBytes: 10 * 1024 * 1024 },
  hero:          { folder: "heroes",         types: IMAGE_TYPES,        maxBytes: 10 * 1024 * 1024 },
  gallery:       { folder: "gallery",        types: IMAGE_TYPES,        maxBytes: 10 * 1024 * 1024 },
  "product-cover": { folder: "product-covers", types: IMAGE_TYPES,     maxBytes: 10 * 1024 * 1024 },
  "product-file":  { folder: "products",     types: PRODUCT_FILE_TYPES, maxBytes: 100 * 1024 * 1024 },
  "review-photo":  { folder: "review-photos", types: IMAGE_TYPES,      maxBytes: 10 * 1024 * 1024 },
  audio:         { folder: "audio",          types: AUDIO_TYPES,        maxBytes: 10 * 1024 * 1024 },
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const purpose = (formData.get("purpose") as string | null) ?? "avatar";
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const config = PURPOSE_CONFIG[purpose];
  if (!config) return NextResponse.json({ error: "Invalid upload purpose" }, { status: 400 });

  // Validate MIME type
  if (!config.types.has(file.type)) {
    return NextResponse.json({ error: `File type ${file.type || "unknown"} not allowed` }, { status: 400 });
  }

  // Validate file size
  if (file.size > config.maxBytes) {
    const maxMb = Math.round(config.maxBytes / 1024 / 1024);
    return NextResponse.json({ error: `File too large (max ${maxMb}MB)` }, { status: 400 });
  }

  // Derive extension from MIME type (don't trust user-supplied filename)
  const MIME_EXT: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav",
    "application/pdf": "pdf", "application/zip": "zip", "application/x-zip-compressed": "zip",
    "video/mp4": "mp4", "video/quicktime": "mov",
  };
  const ext = MIME_EXT[file.type] || "bin";

  const blob = await put(`${config.folder}/${userId}-${Date.now()}.${ext}`, file, {
    access: "public",
    allowOverwrite: true,
  });

  // Only update avatarUrl when uploading an avatar
  if (purpose === "avatar") {
    await db.update(profiles)
      .set({ avatarUrl: blob.url })
      .where(eq(profiles.userId, userId));
  }

  return NextResponse.json({ url: blob.url });
}
