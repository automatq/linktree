import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { profiles, products, orders } from "@/db/schema";
import { eq } from "drizzle-orm";

function genId() {
  return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 11);
}

export async function POST(req: Request) {
  const { productId, username } = await req.json();

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!profile.stripeSecretKey) {
    return NextResponse.json({ error: "Seller has not set up payments yet" }, { status: 503 });
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product || !product.active || product.profileId !== profile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const stripe = new Stripe(profile.stripeSecretKey);
  const orderId = genId();
  const origin = new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: product.currency,
          product_data: {
            name: product.title,
            description: product.description || undefined,
            images: product.coverUrl ? [product.coverUrl] : [],
          },
          unit_amount: product.price,
        },
        quantity: 1,
      },
    ],
    return_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
  });

  await db.insert(orders).values({
    id: orderId,
    productId: product.id,
    profileId: profile.id,
    guestEmail: "",
    stripeSessionId: session.id,
    status: "pending",
  });

  return NextResponse.json({
    clientSecret: session.client_secret,
    stripePublishableKey: profile.stripePublishableKey,
  });
}
