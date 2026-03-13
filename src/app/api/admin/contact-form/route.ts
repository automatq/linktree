import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactFormEnabled, contactFormTitle, contactFormEmail } = await req.json();

  await db
    .update(profiles)
    .set({
      contactFormEnabled: contactFormEnabled ?? false,
      contactFormTitle: contactFormTitle || "Get in touch",
      contactFormEmail: contactFormEmail || "",
    })
    .where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true });
}
