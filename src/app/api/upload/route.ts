import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const purpose = (formData.get("purpose") as string | null) ?? "avatar";
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const folder = purpose === "background" ? "backgrounds" : "avatars";
  const blob = await put(`${folder}/${userId}-${Date.now()}.${ext}`, file, {
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
