import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { orders, products, profiles, campaigns, emailTemplates, campaignSends, unsubscribes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";
import { fireWebhook } from "@/lib/webhook";
import { interpolateTemplate } from "@/lib/email";

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
      // Run update + related fetches in parallel
      const [, product, profile] = await Promise.all([
        db.update(orders)
          .set({
            status: "paid",
            guestEmail: session.customer_details?.email || "",
            guestName: session.customer_details?.name || "",
          })
          .where(eq(orders.id, order.id)),
        db.query.products.findFirst({ where: eq(products.id, order.productId) }),
        db.query.profiles.findFirst({ where: eq(profiles.id, order.profileId) }),
      ]);

      if (profile?.webhookUrl) {
        await fireWebhook(profile.webhookUrl, "order.paid", {
          username: profile.username,
          orderId: order.id,
          productId: order.productId,
          guestEmail: session.customer_details?.email || "",
          guestName: session.customer_details?.name || "",
        });
      }

      // Trigger post-purchase email automations
      if (profile && session.customer_details?.email) {
        const guestEmail = session.customer_details.email.toLowerCase();
        const guestName = session.customer_details.name || "";
        try {
          const activeAutos = await db
            .select({ id: campaigns.id, templateId: campaigns.templateId, triggerDelayMinutes: campaigns.triggerDelayMinutes })
            .from(campaigns)
            .where(and(eq(campaigns.profileId, profile.id), eq(campaigns.type, "automation"), eq(campaigns.triggerType, "post_purchase"), eq(campaigns.status, "active")));

          if (activeAutos.length > 0) {
            const unsub = await db.select().from(unsubscribes).where(and(eq(unsubscribes.profileId, profile.id), eq(unsubscribes.email, guestEmail))).limit(1);
            if (unsub.length === 0) {
              const resendAuto = new Resend(process.env.RESEND_API_KEY);
              for (const auto of activeAutos) {
                if (!auto.templateId) continue;
                const existing = await db.select().from(campaignSends).where(and(eq(campaignSends.campaignId, auto.id), eq(campaignSends.recipientEmail, guestEmail))).limit(1);
                if (existing.length > 0) continue;

                const template = await db.query.emailTemplates.findFirst({ where: eq(emailTemplates.id, auto.templateId) });
                if (!template) continue;

                const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/unsubscribe/${profile.username}?email=${encodeURIComponent(guestEmail)}`;
                const vars = { name: guestName, email: guestEmail, product_name: product?.title || "your purchase", unsubscribe_url: unsubscribeUrl };
                const html = interpolateTemplate(template.bodyHtml, vars);
                const subj = interpolateTemplate(template.subject, vars);

                const sendAt = new Date(Date.now() + auto.triggerDelayMinutes * 60 * 1000);
                const sendId = crypto.randomUUID();
                try {
                  const useScheduled = auto.triggerDelayMinutes <= 72 * 60 && auto.triggerDelayMinutes > 0;
                  const result = await resendAuto.emails.send({
                    from: "Newsletter <bookings@resend.dev>",
                    to: guestEmail,
                    subject: subj,
                    html,
                    ...(useScheduled ? { scheduledAt: sendAt.toISOString() } : {}),
                  } as Parameters<typeof resendAuto.emails.send>[0]);
                  await db.insert(campaignSends).values({ id: sendId, campaignId: auto.id, profileId: profile.id, recipientEmail: guestEmail, recipientName: guestName, status: "sent", resendEmailId: (result as any)?.data?.id ?? null, sentAt: new Date() });
                } catch { await db.insert(campaignSends).values({ id: sendId, campaignId: auto.id, profileId: profile.id, recipientEmail: guestEmail, recipientName: guestName, status: "failed" }); }
              }
            }
          }
        } catch (err) { console.error("Post-purchase automation error:", err); }
      }

      if (product?.fileUrl && session.customer_details?.email && process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "TriLink Store <bookings@resend.dev>",
          to: session.customer_details.email,
          subject: `Your download: ${product.title}`,
          html: `
            <p>Hi${session.customer_details.name ? ` ${session.customer_details.name}` : ""},</p>
            <p>Thanks for your purchase! Here is your download link for <strong>${product.title}</strong>:</p>
            <p><a href="${product.fileUrl}" style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Download ${product.title}</a></p>
            <p style="color:#999;font-size:12px;">Keep this email — you can re-download any time.</p>
          `,
        }).catch((err) => console.error("Product download email failed:", err));
      }
    }
  }

  return NextResponse.json({ received: true });
}
