import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.STRIPE_CLIENT_ID) {
    return NextResponse.json({ error: "Stripe Connect not configured" }, { status: 503 });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/stripe/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CLIENT_ID,
    scope: "read_write",
    redirect_uri: redirectUri,
    // Encode the user ID in state so we know who's connecting on callback
    state: userId,
  });

  return NextResponse.json({
    url: `https://connect.stripe.com/oauth/authorize?${params.toString()}`,
  });
}
