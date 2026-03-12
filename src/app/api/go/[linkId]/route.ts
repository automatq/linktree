import { NextResponse } from "next/server";
import { db } from "@/db";
import { links, linkClicks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseDevice, parseReferrer } from "@/lib/tracking";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;

  const link = await db.query.links.findFirst({
    where: eq(links.id, linkId),
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const device = parseDevice(req.headers.get("user-agent") ?? "");
  const referrer = parseReferrer(req.headers.get("referer") ?? "");
  const country = req.headers.get("x-vercel-ip-country") ?? "";

  // Record click (fire-and-forget — don't block the redirect)
  db.insert(linkClicks).values({
    linkId: link.id,
    profileId: link.profileId,
    device,
    referrer,
    country,
  }).catch(() => {});

  const url = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
  return NextResponse.redirect(url, { status: 302 });
}
