import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, teamMembers, teamAvailability } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH: update a team member (name, email, timezone, availability)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Verify member belongs to this profile
  const member = await db.select().from(teamMembers).where(
    and(eq(teamMembers.id, memberId), eq(teamMembers.profileId, profile.id))
  );
  if (member.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, email, timezone, smsNumber, status, windows } = body;

  // Update member details
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (timezone !== undefined) updates.timezone = timezone;
  if (smsNumber !== undefined) updates.smsNumber = smsNumber;
  if (status !== undefined && ["active", "removed"].includes(status)) updates.status = status;

  if (Object.keys(updates).length > 0) {
    await db.update(teamMembers).set(updates).where(eq(teamMembers.id, memberId));
  }

  // Update availability windows if provided
  if (windows !== undefined) {
    await db.delete(teamAvailability).where(eq(teamAvailability.teamMemberId, memberId));
    if (windows.length > 0) {
      await db.insert(teamAvailability).values(
        windows.map((w: { dayOfWeek: number; startTime: string; endTime: string }) => ({
          teamMemberId: memberId,
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE: remove a team member
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Verify member belongs to this profile
  const member = await db.select().from(teamMembers).where(
    and(eq(teamMembers.id, memberId), eq(teamMembers.profileId, profile.id))
  );
  if (member.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete member (cascades to teamAvailability)
  await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

  return NextResponse.json({ ok: true });
}
