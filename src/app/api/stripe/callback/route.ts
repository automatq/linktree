import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId encoded in connect route
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${origin}/admin?stripe=error`);
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(`${origin}/admin?stripe=error`);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Exchange code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const stripeAccountId = response.stripe_user_id;
    if (!stripeAccountId) throw new Error("No account ID returned");

    // Save to the profile matching the userId from state
    await db.update(profiles)
      .set({ stripeAccountId })
      .where(eq(profiles.userId, state));

    return NextResponse.redirect(`${origin}/admin?stripe=connected`);
  } catch {
    return NextResponse.redirect(`${origin}/admin?stripe=error`);
  }
}
