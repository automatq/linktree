import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, groups, groupMembers } from "@/db/schema";
import { eq, asc, ilike, and, ne } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ groups: [], groupsEnabled: false, invitations: [] });

  const [userGroups, incomingInvites] = await Promise.all([
    // Groups this user owns
    db.select().from(groups).where(eq(groups.profileId, profile.id)).orderBy(asc(groups.position)),
    // Pending invitations TO this user (from other people's groups)
    db
      .select({
        id: groupMembers.id,
        groupId: groupMembers.groupId,
        status: groupMembers.status,
        groupName: groups.name,
        ownerName: profiles.name,
        ownerUsername: profiles.username,
        ownerAvatarUrl: profiles.avatarUrl,
        ownerAvatarInitials: profiles.avatarInitials,
        createdAt: groupMembers.createdAt,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .innerJoin(profiles, eq(groups.profileId, profiles.id))
      .where(and(
        eq(groupMembers.memberProfileId, profile.id),
        eq(groupMembers.status, "pending"),
      ))
      .orderBy(asc(groupMembers.createdAt)),
  ]);

  // Fetch members for each group with their profile info + status
  const groupsWithMembers = await Promise.all(
    userGroups.map(async (g) => {
      const members = await db
        .select({
          id: groupMembers.id,
          position: groupMembers.position,
          status: groupMembers.status,
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
    invitations: incomingInvites,
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

  // Add member to group (creates a pending invitation)
  if (action === "addMember") {
    const group = await db.query.groups.findFirst({
      where: and(eq(groups.id, body.groupId), eq(groups.profileId, profile.id)),
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const memberProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, body.memberProfileId),
    });
    if (!memberProfile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check if already a member (any status)
    const existing = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, body.groupId), eq(groupMembers.memberProfileId, body.memberProfileId)));

    if (existing.length > 0) {
      const status = existing[0].status;
      if (status === "declined") {
        // Re-invite: reset to pending
        await db.update(groupMembers).set({ status: "pending" }).where(eq(groupMembers.id, existing[0].id));
        return NextResponse.json({ id: existing[0].id, reinvited: true });
      }
      return NextResponse.json({ error: status === "pending" ? "Invite already sent" : "Already in group" }, { status: 409 });
    }

    const memberCount = await db.select().from(groupMembers).where(eq(groupMembers.groupId, body.groupId));
    const id = crypto.randomUUID();
    await db.insert(groupMembers).values({
      id,
      groupId: body.groupId,
      memberProfileId: body.memberProfileId,
      status: "pending",
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

  // Respond to invitation (accept/decline) — the INVITED user calls this
  if (action === "respond") {
    const { memberId, response } = body;
    if (!["accepted", "declined"].includes(response)) {
      return NextResponse.json({ error: "Invalid response" }, { status: 400 });
    }

    // Verify this invitation belongs to the current user
    const member = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.id, memberId), eq(groupMembers.memberProfileId, profile.id)));

    if (member.length === 0) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    await db.update(groupMembers).set({ status: response }).where(eq(groupMembers.id, memberId));
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
        ne(profiles.id, profile.id),
      ))
      .limit(10);

    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
