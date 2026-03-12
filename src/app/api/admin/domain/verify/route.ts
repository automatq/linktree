import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_zsiuLLBT2DAn7ZdQtwfBVznDkTRA";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "team_TAhERQGuaXj9TJgaIbvBHYK1";

type VercelDomainStatus = {
  verified: boolean;
  configured: boolean;
  verificationRequired?: boolean;
  verification?: { type: string; domain: string; value: string; reason: string }[];
};

async function checkVercelDomain(domain: string): Promise<VercelDomainStatus | null> {
  if (!VERCEL_TOKEN) return null;
  const url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      // Don't cache — always fresh
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      verified: data.verified === true,
      configured: data.configured === true,
      verificationRequired: data.verificationRequired,
      verification: data.verification,
    };
  } catch {
    return null;
  }
}

async function checkDomainReachable(domain: string, username: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      // We just need to know if the domain resolves and responds
    });
    // If we get any HTTP response (even non-200) the domain is routing to our app
    // Check if it looks like our app by inspecting headers or response
    return res.ok || res.status === 404; // 404 means server responded (domain is live)
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  if (!domain) return NextResponse.json({ error: "Missing domain" }, { status: 400 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (profile.customDomain !== domain) {
    return NextResponse.json({ error: "Domain not registered to this account" }, { status: 403 });
  }

  // Check Vercel domain status
  const vercelStatus = await checkVercelDomain(domain);

  // Check if domain actually responds
  const reachable = await checkDomainReachable(domain, profile.username);

  if (!VERCEL_TOKEN) {
    // No token — can only check reachability
    return NextResponse.json({
      status: reachable ? "active" : "pending",
      message: reachable
        ? "Domain is connected and working!"
        : "DNS not yet propagated. This can take a few minutes to 48 hours.",
    });
  }

  if (!vercelStatus) {
    return NextResponse.json({ status: "error", message: "Could not check domain status." });
  }

  if (vercelStatus.verified && reachable) {
    return NextResponse.json({ status: "active", message: "Domain is connected and working!" });
  }

  if (vercelStatus.verified && !reachable) {
    return NextResponse.json({
      status: "pending",
      message: "DNS is verified but domain isn't responding yet. Try again in a moment.",
    });
  }

  // Not yet verified — return verification instructions if available
  const hint = vercelStatus.verification?.[0];
  return NextResponse.json({
    status: "pending",
    message: "DNS not yet propagated. Make sure your CNAME record is set correctly.",
    hint: hint
      ? `Vercel also requires a TXT record: Name=${hint.domain}, Value=${hint.value}`
      : null,
  });
}
