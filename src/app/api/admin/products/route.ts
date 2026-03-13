import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles, products } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

function genId() {
  return crypto.randomUUID();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ products: [] });

  const userProducts = await db.select().from(products)
    .where(eq(products.profileId, profile.id))
    .orderBy(asc(products.position));

  return NextResponse.json({ products: userProducts });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await req.json();

  // Full replace
  await db.delete(products).where(eq(products.profileId, profile.id));

  if (body.products && body.products.length > 0) {
    await db.insert(products).values(
      body.products.map((p: {
        id?: string; title: string; description: string; price: number;
        currency: string; fileUrl: string; coverUrl: string; active: boolean;
      }, i: number) => ({
        id: p.id || genId(),
        profileId: profile.id,
        title: p.title || "",
        description: p.description || "",
        price: Math.round((p.price ?? 0) * 100), // dollars → cents
        currency: p.currency || "usd",
        fileUrl: p.fileUrl || "",
        coverUrl: p.coverUrl || "",
        active: p.active ?? true,
        position: i,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
