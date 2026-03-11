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
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const blob = await put(`avatars/${userId}.${ext}`, file, {
    access: "public",
    allowOverwrite: true,
  });

  // Persist to profile if it exists
  await db.update(profiles)
    .set({ avatarUrl: blob.url })
    .where(eq(profiles.userId, userId));

  return NextResponse.json({ url: blob.url });
}
