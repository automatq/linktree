import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, teamMembers, teamAvailability } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET: list team members for the current user's profile
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ members: [] });

  const members = await db.select().from(teamMembers).where(eq(teamMembers.profileId, profile.id));

  // Load availability for each member
  const membersWithAvailability = await Promise.all(
    members.map(async (m) => {
      const windows = await db.select().from(teamAvailability).where(eq(teamAvailability.teamMemberId, m.id));
      return {
        ...m,
        createdAt: m.createdAt?.toISOString() ?? null,
        availability: windows.map((w) => ({
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
      };
    })
  );

  return NextResponse.json({ members: membersWithAvailability });
}

// POST: add a team member
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await req.json();
  const { name, email, timezone, smsNumber, memberUserId } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  await db.insert(teamMembers).values({
    id,
    profileId: profile.id,
    userId: memberUserId || "", // Can be empty until they link their Clerk account
    name,
    email,
    timezone: timezone || profile.bookingTimezone || "UTC",
    smsNumber: smsNumber || "",
    role: "member",
    status: "active",
  });

  return NextResponse.json({ ok: true, id });
}
