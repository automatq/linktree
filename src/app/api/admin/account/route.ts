import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Require confirmation phrase in the body
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "DELETE MY ACCOUNT") {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  // Delete profile (cascades to all child tables)
  await db.delete(profiles).where(eq(profiles.userId, userId));

  // Delete Clerk user
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);
  } catch (e) {
    // Profile is already gone — if Clerk delete fails, log but don't block
    console.error("Failed to delete Clerk user:", e);
  }

  return NextResponse.json({ ok: true });
}
