import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, links, linkClicks, profileViews } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const daysParam = parseInt(url.searchParams.get("days") ?? "14", 10);
  const days = [7, 14, 30].includes(daysParam) ? daysParam : 14;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (!profile) return NextResponse.json({
    byLink: {}, clicksByDay: [], viewsByDay: [], totalViews: 0, bestDay: null,
    linkTitles: {}, referrers: [], devices: [], countries: [],
  });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const [
    clickRows, dailyRows, viewRow, linkRows, dailyViewRows,
    referrerRows, deviceRows, countryRows,
  ] = await Promise.all([
    db
      .select({ linkId: linkClicks.linkId, count: sql<number>`count(*)::int` })
      .from(linkClicks)
      .where(eq(linkClicks.profileId, profile.id))
      .groupBy(linkClicks.linkId),

    db
      .select({
        date: sql<string>`DATE(${linkClicks.clickedAt} AT TIME ZONE 'UTC')::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(linkClicks)
      .where(and(eq(linkClicks.profileId, profile.id), gte(linkClicks.clickedAt, startDate)))
      .groupBy(sql`DATE(${linkClicks.clickedAt} AT TIME ZONE 'UTC')`)
      .orderBy(sql`DATE(${linkClicks.clickedAt} AT TIME ZONE 'UTC')`),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileViews)
      .where(eq(profileViews.profileId, profile.id)),

    db.select({ id: links.id, title: links.title }).from(links).where(eq(links.profileId, profile.id)),

    db
      .select({
        date: sql<string>`DATE(${profileViews.viewedAt} AT TIME ZONE 'UTC')::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileViews)
      .where(and(eq(profileViews.profileId, profile.id), gte(profileViews.viewedAt, startDate)))
      .groupBy(sql`DATE(${profileViews.viewedAt} AT TIME ZONE 'UTC')`)
      .orderBy(sql`DATE(${profileViews.viewedAt} AT TIME ZONE 'UTC')`),

    db
      .select({ referrer: profileViews.referrer, count: sql<number>`count(*)::int` })
      .from(profileViews)
      .where(and(eq(profileViews.profileId, profile.id), gte(profileViews.viewedAt, startDate)))
      .groupBy(profileViews.referrer)
      .orderBy(sql`count(*) desc`)
      .limit(8),

    db
      .select({ device: profileViews.device, count: sql<number>`count(*)::int` })
      .from(profileViews)
      .where(and(eq(profileViews.profileId, profile.id), gte(profileViews.viewedAt, startDate)))
      .groupBy(profileViews.device)
      .orderBy(sql`count(*) desc`),

    db
      .select({ country: profileViews.country, count: sql<number>`count(*)::int` })
      .from(profileViews)
      .where(and(eq(profileViews.profileId, profile.id), gte(profileViews.viewedAt, startDate), sql`${profileViews.country} != ''`))
      .groupBy(profileViews.country)
      .orderBy(sql`count(*) desc`)
      .limit(8),
  ]);

  const byLink: Record<string, number> = {};
  for (const row of clickRows) byLink[row.linkId] = row.count;

  const dailyMap: Record<string, number> = {};
  for (const row of dailyRows) dailyMap[row.date] = row.count;
  const clicksByDay: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    clicksByDay.push({ date: dateStr, count: dailyMap[dateStr] ?? 0 });
  }

  const viewDailyMap: Record<string, number> = {};
  for (const row of dailyViewRows) viewDailyMap[row.date] = row.count;
  const viewsByDay: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    viewsByDay.push({ date: dateStr, count: viewDailyMap[dateStr] ?? 0 });
  }

  let bestDay: { date: string; count: number } | null = null;
  for (const d of clicksByDay) {
    if (d.count > 0 && (!bestDay || d.count > bestDay.count)) bestDay = d;
  }

  const linkTitles: Record<string, string> = {};
  for (const l of linkRows) linkTitles[l.id] = l.title;

  return NextResponse.json({
    byLink,
    clicksByDay,
    viewsByDay,
    totalViews: viewRow[0]?.count ?? 0,
    bestDay,
    linkTitles,
    referrers: referrerRows.map((r) => ({ label: r.referrer || "Direct", count: r.count })),
    devices: deviceRows.map((r) => ({ device: r.device || "unknown", count: r.count })),
    countries: countryRows.map((r) => ({ country: r.country, count: r.count })),
  });
}
