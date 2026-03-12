import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_zsiuLLBT2DAn7ZdQtwfBVznDkTRA";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "team_TAhERQGuaXj9TJgaIbvBHYK1";

async function vercelAddDomain(domain: string) {
  if (!VERCEL_TOKEN) return { ok: false, error: "No Vercel token" };
  const url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function vercelRemoveDomain(domain: string) {
  if (!VERCEL_TOKEN) return;
  const url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`;
  await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain } = await req.json();
  const cleaned = (domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Remove old domain from Vercel if different
  if (profile.customDomain && profile.customDomain !== cleaned) {
    await vercelRemoveDomain(profile.customDomain);
  }

  // Register new domain with Vercel
  if (cleaned) {
    const result = await vercelAddDomain(cleaned);
    if (!result.ok && result.data?.error?.code !== "domain_already_in_use") {
      // Still save to DB even if Vercel API fails — user may add domain to Vercel manually
    }
  }

  await db.update(profiles)
    .set({ customDomain: cleaned })
    .where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true, domain: cleaned });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (profile?.customDomain) {
    await vercelRemoveDomain(profile.customDomain);
  }

  await db.update(profiles)
    .set({ customDomain: "" })
    .where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true });
}
