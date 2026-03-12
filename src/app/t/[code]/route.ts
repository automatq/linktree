import { NextResponse } from "next/server";
import { db } from "@/db";
import { trackedLinks, trackedLinkClicks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseDevice, parseReferrer } from "@/lib/tracking";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const link = await db.query.trackedLinks.findFirst({
    where: eq(trackedLinks.id, code),
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const device = parseDevice(req.headers.get("user-agent") ?? "");
  const referrer = parseReferrer(req.headers.get("referer") ?? "");
  const country = req.headers.get("x-vercel-ip-country") ?? "";

  db.insert(trackedLinkClicks).values({
    trackedLinkId: link.id,
    profileId: link.profileId,
    device,
    referrer,
    country,
  }).catch(() => {});

  const url = /^https?:\/\//i.test(link.destinationUrl)
    ? link.destinationUrl
    : `https://${link.destinationUrl}`;
  return NextResponse.redirect(url, { status: 302 });
}
