import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, reactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { isRateLimited } from "@/lib/rate-limit";

const ALLOWED_TYPES = ["wall_note", "voice_note", "review", "poll"];
const ALLOWED_EMOJIS = ["❤️", "🔥", "👏", "😂", "😮", "💯"];

// GET — fetch reaction counts + user's reactions for a set of targets
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile) return NextResponse.json({ reactions: {} });

  const targetType = req.nextUrl.searchParams.get("type");
  const targetIds = req.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) || [];

  if (!targetType || !ALLOWED_TYPES.includes(targetType) || targetIds.length === 0) {
    return NextResponse.json({ reactions: {} });
  }

  // Get current user for checking their reactions
  const { userId } = await auth();
  let reactorProfileId: number | null = null;
  if (userId) {
    const reactor = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
    if (reactor) reactorProfileId = reactor.id;
  }

  // Fetch counts grouped by targetId + emoji
  const counts = await db
    .select({
      targetId: reactions.targetId,
      emoji: reactions.emoji,
      count: sql<number>`count(*)::int`,
    })
    .from(reactions)
    .where(
      and(
        eq(reactions.targetType, targetType),
        eq(reactions.profileId, profile.id),
        sql`${reactions.targetId} = ANY(${targetIds})`,
      )
    )
    .groupBy(reactions.targetId, reactions.emoji);

  // Fetch user's own reactions
  let userReactions: Array<{ targetId: string; emoji: string }> = [];
  if (reactorProfileId) {
    userReactions = await db
      .select({ targetId: reactions.targetId, emoji: reactions.emoji })
      .from(reactions)
      .where(
        and(
          eq(reactions.targetType, targetType),
          eq(reactions.profileId, profile.id),
          eq(reactions.reactorProfileId, reactorProfileId),
          sql`${reactions.targetId} = ANY(${targetIds})`,
        )
      );
  }

  // Build response: { [targetId]: { counts: { "❤️": 3 }, userEmojis: ["❤️"] } }
  const result: Record<string, { counts: Record<string, number>; userEmojis: string[] }> = {};
  for (const id of targetIds) {
    result[id] = { counts: {}, userEmojis: [] };
  }
  for (const row of counts) {
    if (!result[row.targetId]) result[row.targetId] = { counts: {}, userEmojis: [] };
    result[row.targetId].counts[row.emoji] = row.count;
  }
  for (const row of userReactions) {
    if (result[row.targetId]) {
      result[row.targetId].userEmojis.push(row.emoji);
    }
  }

  return NextResponse.json({ reactions: result });
}

// POST — toggle a reaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in to react" }, { status: 401 });
  }

  const reactor = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!reactor) {
    return NextResponse.json({ error: "You need a profile to react" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(`react:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Slow down — try again in a minute" }, { status: 429 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await req.json();
  const { targetType, targetId, emoji } = body;

  if (!targetType || !ALLOWED_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
  }
  if (!targetId || !emoji || !ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  // Check if already reacted with this emoji
  const existing = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId),
        eq(reactions.emoji, emoji),
        eq(reactions.reactorProfileId, reactor.id),
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Remove reaction (toggle off)
    await db.delete(reactions).where(eq(reactions.id, existing[0].id));
    return NextResponse.json({ ok: true, action: "removed" });
  }

  // Add reaction
  await db.insert(reactions).values({
    id: crypto.randomUUID(),
    profileId: profile.id,
    targetType,
    targetId,
    emoji,
    reactorProfileId: reactor.id,
  });

  return NextResponse.json({ ok: true, action: "added" });
}
