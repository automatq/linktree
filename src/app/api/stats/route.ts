import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, linkClicks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (!profile) return NextResponse.json({});

  const rows = await db
    .select({ linkId: linkClicks.linkId, count: sql<number>`count(*)::int` })
    .from(linkClicks)
    .where(eq(linkClicks.profileId, profile.id))
    .groupBy(linkClicks.linkId);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.linkId] = row.count;
  }

  return NextResponse.json(result);
}
