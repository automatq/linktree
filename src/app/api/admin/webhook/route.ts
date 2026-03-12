import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhookUrl } = await req.json();

  await db
    .update(profiles)
    .set({ webhookUrl: webhookUrl?.trim() || "" })
    .where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true });
}
