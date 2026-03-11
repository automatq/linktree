import { NextResponse } from "next/server";
import { db } from "@/db";
import { links, linkClicks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;

  const link = await db.query.links.findFirst({
    where: eq(links.id, linkId),
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Record click (fire-and-forget style — don't block the redirect)
  db.insert(linkClicks).values({
    linkId: link.id,
    profileId: link.profileId,
  }).catch(() => {});

  const url = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
  return NextResponse.redirect(url, { status: 302 });
}
