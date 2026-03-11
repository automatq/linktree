import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, links, linkClicks, profileViews } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (!profile) return NextResponse.json({ byLink: {}, clicksByDay: [], totalViews: 0 });

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [clickRows, dailyRows, viewRow, linkRows] = await Promise.all([
    // clicks per link (all time)
    db
      .select({ linkId: linkClicks.linkId, count: sql<number>`count(*)::int` })
      .from(linkClicks)
      .where(eq(linkClicks.profileId, profile.id))
      .groupBy(linkClicks.linkId),

    // clicks per day (last 14 days)
    db
      .select({
        date: sql<string>`DATE(${linkClicks.clickedAt} AT TIME ZONE 'UTC')::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(linkClicks)
      .where(and(eq(linkClicks.profileId, profile.id), gte(linkClicks.clickedAt, fourteenDaysAgo)))
      .groupBy(sql`DATE(${linkClicks.clickedAt} AT TIME ZONE 'UTC')`)
      .orderBy(sql`DATE(${linkClicks.clickedAt} AT TIME ZONE 'UTC')`),

    // total profile views
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileViews)
      .where(eq(profileViews.profileId, profile.id)),

    // link titles for analytics
    db.select({ id: links.id, title: links.title }).from(links).where(eq(links.profileId, profile.id)),
  ]);

  const byLink: Record<string, number> = {};
  for (const row of clickRows) {
    byLink[row.linkId] = row.count;
  }

  // Fill in all 14 days (including zeros)
  const dailyMap: Record<string, number> = {};
  for (const row of dailyRows) {
    dailyMap[row.date] = row.count;
  }
  const clicksByDay: Array<{ date: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    clicksByDay.push({ date: dateStr, count: dailyMap[dateStr] ?? 0 });
  }

  const linkTitles: Record<string, string> = {};
  for (const l of linkRows) {
    linkTitles[l.id] = l.title;
  }

  return NextResponse.json({
    byLink,
    clicksByDay,
    totalViews: viewRow[0]?.count ?? 0,
    linkTitles,
  });
}
