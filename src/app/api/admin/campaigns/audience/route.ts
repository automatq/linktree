import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveAudience } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { filter } = await req.json();
  if (!filter) return NextResponse.json({ error: "filter required" }, { status: 400 });

  const recipients = await resolveAudience(profile.id, filter);

  return NextResponse.json({
    count: recipients.length,
    preview: recipients.slice(0, 10).map((r) => ({ email: r.email, name: r.name })),
  });
}
