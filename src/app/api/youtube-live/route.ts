import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) return NextResponse.json({ isLive: false });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ isLive: false });

  try {
    const ytUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    ytUrl.searchParams.set("part", "snippet");
    ytUrl.searchParams.set("id", videoId);
    ytUrl.searchParams.set("key", apiKey);
    const res = await fetch(ytUrl.toString(), {
      next: { revalidate: 30 }, // cache for 30s to reduce API calls
    });
    const data = await res.json();
    const isLive = data?.items?.[0]?.snippet?.liveBroadcastContent === "live";
    return NextResponse.json({ isLive });
  } catch {
    return NextResponse.json({ isLive: false });
  }
}
