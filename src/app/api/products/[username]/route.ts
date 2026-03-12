import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, products } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
  });

  if (!profile) return NextResponse.json({ products: [] });

  const userProducts = await db.select().from(products)
    .where(eq(products.profileId, profile.id))
    .orderBy(asc(products.position));

  return NextResponse.json({
    products: userProducts.filter((p) => p.active).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      currency: p.currency,
      coverUrl: p.coverUrl,
      // fileUrl intentionally omitted — only exposed after purchase
    })),
  });
}
