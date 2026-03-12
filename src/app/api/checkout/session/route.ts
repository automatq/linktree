import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { orders, products, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  if (!sessionId || !orderId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Get the seller's connected account ID
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, order.profileId) });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Retrieve session from the connected account
  const sessionOptions = profile?.stripeAccountId
    ? { stripeAccount: profile.stripeAccountId }
    : undefined;

  const session = await stripe.checkout.sessions.retrieve(sessionId, {}, sessionOptions);

  if (session.payment_status !== "paid") {
    return NextResponse.json({ paid: false });
  }

  if (order.status !== "paid") {
    await db.update(orders)
      .set({
        status: "paid",
        guestEmail: session.customer_details?.email || "",
        guestName: session.customer_details?.name || "",
      })
      .where(eq(orders.id, orderId));
  }

  const product = await db.query.products.findFirst({ where: eq(products.id, order.productId) });

  return NextResponse.json({
    paid: true,
    productTitle: product?.title || "",
    fileUrl: product?.fileUrl || "",
  });
}
