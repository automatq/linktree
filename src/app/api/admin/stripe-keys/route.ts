import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { publishableKey, secretKey } = await req.json();

  // Basic format validation
  if (publishableKey && !publishableKey.startsWith("pk_")) {
    return NextResponse.json({ error: "Publishable key must start with pk_" }, { status: 400 });
  }
  if (secretKey && !secretKey.startsWith("sk_")) {
    return NextResponse.json({ error: "Secret key must start with sk_" }, { status: 400 });
  }

  const update: Record<string, string> = {
    stripePublishableKey: publishableKey || "",
  };
  // Only overwrite secret key if a new one is explicitly provided
  if (secretKey) update.stripeSecretKey = secretKey;

  await db.update(profiles).set(update).where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ hasKeys: false });

  return NextResponse.json({
    publishableKey: profile.stripePublishableKey || "",
    // Return masked secret — just enough to confirm it's been set
    secretKeySet: !!profile.stripeSecretKey,
  });
}
