import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, subscribers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ subscribers: [] });

  const rows = await db.select().from(subscribers)
    .where(eq(subscribers.profileId, profile.id))
    .orderBy(desc(subscribers.subscribedAt));

  return NextResponse.json({
    subscribers: rows.map((s) => ({
      ...s,
      subscribedAt: s.subscribedAt?.toISOString() ?? null,
    })),
  });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(subscribers).where(eq(subscribers.id, id));
  return NextResponse.json({ ok: true });
}
