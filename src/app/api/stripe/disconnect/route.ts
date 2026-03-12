import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Deauthorize from Stripe (best-effort)
  if (process.env.STRIPE_SECRET_KEY && profile.stripeAccountId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.oauth.deauthorize({
        client_id: process.env.STRIPE_CLIENT_ID!,
        stripe_user_id: profile.stripeAccountId,
      });
    } catch {
      // Continue even if deauthorize fails — clear locally regardless
    }
  }

  await db.update(profiles)
    .set({ stripeAccountId: "" })
    .where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true });
}
