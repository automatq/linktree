import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, polls, pollOptions, pollVotes } from "@/db/schema";
import { eq, asc, and, sql } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ polls: [], pollsEnabled: false });

  const userPolls = await db
    .select()
    .from(polls)
    .where(eq(polls.profileId, profile.id))
    .orderBy(asc(polls.position));

  const pollsWithOptions = await Promise.all(
    userPolls.map(async (poll) => {
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

      const [{ total }] = await db
        .select({ total: sql<number>`count(distinct ${pollVotes.voterProfileId})::int` })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, poll.id));

      return {
        id: poll.id,
        question: poll.question,
        active: poll.active,
        multipleChoice: poll.multipleChoice,
        endsAt: poll.endsAt?.toISOString() ?? null,
        totalVoters: total,
        options: options.map((o) => ({
          id: o.id,
          text: o.text,
          votes: voteMap[o.id] ?? 0,
        })),
      };
    })
  );

  return NextResponse.json({
    pollsEnabled: profile.pollsEnabled,
    polls: pollsWithOptions,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  // Toggle polls enabled
  if (action === "settings") {
    await db.update(profiles).set({
      pollsEnabled: body.pollsEnabled,
    }).where(eq(profiles.userId, userId));
    return NextResponse.json({ ok: true });
  }

  // Create a new poll
  if (action === "create") {
    const question = (body.question || "").trim().slice(0, 200);
    const options: string[] = (body.options || []).map((o: string) => o.trim().slice(0, 100)).filter(Boolean);
    if (!question || options.length < 2) {
      return NextResponse.json({ error: "Question and at least 2 options required" }, { status: 400 });
    }
    if (options.length > 10) {
      return NextResponse.json({ error: "Maximum 10 options" }, { status: 400 });
    }

    // Get next position
    const existing = await db.select({ position: polls.position }).from(polls).where(eq(polls.profileId, profile.id)).orderBy(asc(polls.position));
    const nextPos = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;

    const pollId = crypto.randomUUID();
    await db.insert(polls).values({
      id: pollId,
      profileId: profile.id,
      question,
      multipleChoice: body.multipleChoice ?? false,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      position: nextPos,
    });

    for (let i = 0; i < options.length; i++) {
      await db.insert(pollOptions).values({
        id: crypto.randomUUID(),
        pollId,
        text: options[i],
        position: i,
      });
    }

    // Return the new poll with options
    const newOptions = await db.select().from(pollOptions).where(eq(pollOptions.pollId, pollId)).orderBy(asc(pollOptions.position));
    return NextResponse.json({
      ok: true,
      poll: {
        id: pollId,
        question,
        active: true,
        multipleChoice: body.multipleChoice ?? false,
        endsAt: body.endsAt ?? null,
        totalVoters: 0,
        options: newOptions.map((o) => ({ id: o.id, text: o.text, votes: 0 })),
      },
    });
  }

  // Toggle poll active/inactive
  if (action === "toggle") {
    await db.update(polls).set({ active: body.active }).where(and(eq(polls.id, body.pollId), eq(polls.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  // Delete a poll
  if (action === "delete") {
    await db.delete(polls).where(and(eq(polls.id, body.pollId), eq(polls.profileId, profile.id)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
