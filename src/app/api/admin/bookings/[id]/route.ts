import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, bookings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  // Only allow valid status values
  if (status !== "confirmed" && status !== "cancelled") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.update(bookings)
    .set({ status })
    .where(and(eq(bookings.id, id), eq(bookings.profileId, profile.id)));

  return NextResponse.json({ ok: true });
}
