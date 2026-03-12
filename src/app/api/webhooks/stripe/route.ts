import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle events from connected accounts (Connect webhooks)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const order = await db.query.orders.findFirst({
      where: eq(orders.stripeSessionId, session.id),
    });

    if (order) {
      await db.update(orders)
        .set({
          status: "paid",
          guestEmail: session.customer_details?.email || "",
          guestName: session.customer_details?.name || "",
        })
        .where(eq(orders.id, order.id));

      const product = await db.query.products.findFirst({
        where: eq(products.id, order.productId),
      });

      if (product?.fileUrl && session.customer_details?.email && process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "noreply@trilink-nine-neon.vercel.app",
          to: session.customer_details.email,
          subject: `Your download: ${product.title}`,
          html: `
            <p>Hi${session.customer_details.name ? ` ${session.customer_details.name}` : ""},</p>
            <p>Thanks for your purchase! Here is your download link for <strong>${product.title}</strong>:</p>
            <p><a href="${product.fileUrl}" style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Download ${product.title}</a></p>
            <p style="color:#999;font-size:12px;">Keep this email — you can re-download any time.</p>
          `,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ received: true });
}
