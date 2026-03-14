import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, groups, groupMembers } from "@/db/schema";
import { eq, asc, ilike, and, ne } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ groups: [], groupsEnabled: false });

  const userGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.profileId, profile.id))
    .orderBy(asc(groups.position));

  // Fetch members for each group with their profile info
  const groupsWithMembers = await Promise.all(
    userGroups.map(async (g) => {
      const members = await db
        .select({
          id: groupMembers.id,
          position: groupMembers.position,
          profileId: profiles.id,
          username: profiles.username,
          name: profiles.name,
          avatarUrl: profiles.avatarUrl,
          avatarInitials: profiles.avatarInitials,
          bio: profiles.bio,
        })
        .from(groupMembers)
        .innerJoin(profiles, eq(groupMembers.memberProfileId, profiles.id))
        .where(eq(groupMembers.groupId, g.id))
        .orderBy(asc(groupMembers.position));

      return { ...g, members };
    })
  );

  return NextResponse.json({
    groups: groupsWithMembers,
    groupsEnabled: profile.groupsEnabled,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  // Toggle groups enabled
  if (action === "settings") {
    await db.update(profiles).set({ groupsEnabled: body.groupsEnabled }).where(eq(profiles.userId, userId));
    return NextResponse.json({ ok: true });
  }

  // Create a new group
  if (action === "create") {
    const id = crypto.randomUUID();
    const existingCount = await db.select().from(groups).where(eq(groups.profileId, profile.id));
    await db.insert(groups).values({
      id,
      profileId: profile.id,
      name: body.name || "My Crew",
      position: existingCount.length,
    });
    return NextResponse.json({ id });
  }

  // Update group name
  if (action === "update") {
    await db
      .update(groups)
      .set({ name: body.name })
      .where(and(eq(groups.id, body.groupId), eq(groups.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  // Delete a group
  if (action === "delete") {
    await db
      .delete(groups)
      .where(and(eq(groups.id, body.groupId), eq(groups.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  // Add member to group
  if (action === "addMember") {
    // Verify the group belongs to this user
    const group = await db.query.groups.findFirst({
      where: and(eq(groups.id, body.groupId), eq(groups.profileId, profile.id)),
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Verify the member profile exists
    const memberProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, body.memberProfileId),
    });
    if (!memberProfile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check if already a member
    const existing = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, body.groupId), eq(groupMembers.memberProfileId, body.memberProfileId)));
    if (existing.length > 0) return NextResponse.json({ error: "Already in group" }, { status: 409 });

    const memberCount = await db.select().from(groupMembers).where(eq(groupMembers.groupId, body.groupId));
    const id = crypto.randomUUID();
    await db.insert(groupMembers).values({
      id,
      groupId: body.groupId,
      memberProfileId: body.memberProfileId,
      position: memberCount.length,
    });
    return NextResponse.json({ id });
  }

  // Remove member from group
  if (action === "removeMember") {
    const group = await db.query.groups.findFirst({
      where: and(eq(groups.id, body.groupId), eq(groups.profileId, profile.id)),
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.id, body.memberId), eq(groupMembers.groupId, body.groupId)));
    return NextResponse.json({ ok: true });
  }

  // Search users by handle
  if (action === "search") {
    const query = (body.query || "").trim().replace(/^@/, "").toLowerCase();
    if (!query || query.length < 2) return NextResponse.json({ results: [] });

    const results = await db
      .select({
        id: profiles.id,
        username: profiles.username,
        name: profiles.name,
        avatarUrl: profiles.avatarUrl,
        avatarInitials: profiles.avatarInitials,
      })
      .from(profiles)
      .where(and(
        ilike(profiles.username, `%${query}%`),
        ne(profiles.id, profile.id), // exclude self
      ))
      .limit(10);

    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
