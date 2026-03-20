import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, polls, pollOptions, pollVotes } from "@/db/schema";
import { eq, asc, and, desc, sql } from "drizzle-orm";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.pollsEnabled) {
    return NextResponse.json({ polls: [] });
  }

  // Get active polls
  const activePolls = await db
    .select()
    .from(polls)
    .where(and(eq(polls.profileId, profile.id), eq(polls.active, true)))
    .orderBy(asc(polls.position));

  // Get current user's profile for vote checking
  const { userId } = await auth();
  let voterProfileId: number | null = null;
  if (userId) {
    const voterProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (voterProfile) voterProfileId = voterProfile.id;
  }

  const pollsWithOptions = await Promise.all(
    activePolls.map(async (poll) => {
      // Filter out expired polls
      if (poll.endsAt && new Date() > poll.endsAt) return null;

      const options = await db
        .select()
        .from(pollOptions)
        .where(eq(pollOptions.pollId, poll.id))
        .orderBy(asc(pollOptions.position));

      // Count votes per option
      const voteCounts = await db
        .select({
          optionId: pollVotes.optionId,
          count: sql<number>`count(*)::int`,
        })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, poll.id))
        .groupBy(pollVotes.optionId);

      const voteMap = Object.fromEntries(voteCounts.map((v) => [v.optionId, v.count]));

      // Total votes (unique voters)
      const [{ total }] = await db
        .select({ total: sql<number>`count(distinct ${pollVotes.voterProfileId})::int` })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, poll.id));

      // Check if current user already voted
      let userVotes: string[] = [];
      if (voterProfileId) {
        const existing = await db
          .select({ optionId: pollVotes.optionId })
          .from(pollVotes)
          .where(and(eq(pollVotes.pollId, poll.id), eq(pollVotes.voterProfileId, voterProfileId)));
        userVotes = existing.map((v) => v.optionId);
      }

      return {
        id: poll.id,
        question: poll.question,
        multipleChoice: poll.multipleChoice,
        endsAt: poll.endsAt?.toISOString() ?? null,
        createdAt: poll.createdAt?.toISOString(),
        totalVoters: total,
        userVotes,
        options: options.map((o) => ({
          id: o.id,
          text: o.text,
          votes: voteMap[o.id] ?? 0,
        })),
      };
    })
  );

  return NextResponse.json({ polls: pollsWithOptions.filter(Boolean) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in to vote" }, { status: 401 });
  }

  const voterProfile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  if (!voterProfile) {
    return NextResponse.json({ error: "You need a profile to vote" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(`poll:${ip}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: "Slow down — try again in a minute" }, { status: 429 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile || !profile.pollsEnabled) {
    return NextResponse.json({ error: "Polls not available" }, { status: 404 });
  }

  const body = await req.json();
  const { pollId, optionId } = body;

  if (!pollId || !optionId) {
    return NextResponse.json({ error: "pollId and optionId required" }, { status: 400 });
  }

  // Verify poll exists, is active, and belongs to this profile
  const poll = await db.query.polls.findFirst({
    where: and(eq(polls.id, pollId), eq(polls.profileId, profile.id), eq(polls.active, true)),
  });
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  // Check if poll has ended
  if (poll.endsAt && new Date() > poll.endsAt) {
    return NextResponse.json({ error: "This poll has ended" }, { status: 400 });
  }

  // Verify option belongs to this poll
  const option = await db.query.pollOptions.findFirst({
    where: and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, pollId)),
  });
  if (!option) return NextResponse.json({ error: "Option not found" }, { status: 404 });

  // Check existing votes
  const existingVotes = await db
    .select()
    .from(pollVotes)
    .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.voterProfileId, voterProfile.id)));

  if (!poll.multipleChoice) {
    // Single choice: if already voted for this option, remove it (toggle). Otherwise replace.
    const existingForOption = existingVotes.find((v) => v.optionId === optionId);
    if (existingForOption) {
      // Toggle off
      await db.delete(pollVotes).where(eq(pollVotes.id, existingForOption.id));
      return NextResponse.json({ ok: true, action: "removed" });
    }
    // Remove any previous vote and add new one
    for (const v of existingVotes) {
      await db.delete(pollVotes).where(eq(pollVotes.id, v.id));
    }
  } else {
    // Multiple choice: toggle this option
    const existingForOption = existingVotes.find((v) => v.optionId === optionId);
    if (existingForOption) {
      await db.delete(pollVotes).where(eq(pollVotes.id, existingForOption.id));
      return NextResponse.json({ ok: true, action: "removed" });
    }
  }

  // Cast vote
  await db.insert(pollVotes).values({
    id: crypto.randomUUID(),
    pollId,
    optionId,
    voterProfileId: voterProfile.id,
  });

  return NextResponse.json({ ok: true, action: "voted" });
}
