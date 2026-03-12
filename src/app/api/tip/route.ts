import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { username, amount } = await req.json(); // amount in dollars

  if (!username || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!profile.tipJarEnabled) return NextResponse.json({ error: "Tip jar not enabled" }, { status: 403 });
  if (!profile.stripeSecretKey) return NextResponse.json({ error: "Payments not set up" }, { status: 503 });

  const amountCents = Math.round(Number(amount) * 100);
  if (amountCents < 50) return NextResponse.json({ error: "Minimum tip is $0.50" }, { status: 400 });

  const stripe = new Stripe(profile.stripeSecretKey);
  const origin = new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: profile.tipJarTitle || "Tip" },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    return_url: `${origin}/${profile.username}?tip=thanks`,
  });

  return NextResponse.json({
    clientSecret: session.client_secret,
    stripePublishableKey: profile.stripePublishableKey,
  });
}
