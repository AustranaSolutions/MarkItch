import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getFollowersForBrand, getFollowingForBrand } from "@/lib/follow";

/**
 * RN-7b: „Follower“ bzw. „Folgt“ einer Marke für die App — dieselben Listen
 * wie /brands/[slug]/followers und /following im Web. `?type=following`,
 * sonst Follower. Beide Einträge-Arten auf ein Format gebracht: Name, und
 * falls es eine Marke ist, deren Slug (antippbar).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [brand] = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) return NextResponse.json({ error: "Diese Marke gibt es nicht." }, { status: 404 });

  if (request.nextUrl.searchParams.get("type") === "following") {
    const rows = await getFollowingForBrand(brand.id);
    return NextResponse.json({
      brandName: brand.name,
      entries: rows.map((b) => ({ key: b.id, name: b.name, slug: b.slug, logoUrl: b.logoUrl })),
    });
  }
  const rows = await getFollowersForBrand(brand.id);
  return NextResponse.json({
    brandName: brand.name,
    entries: rows.map((f) => ({
      key: f.userId,
      name: f.label,
      slug: f.link?.startsWith("/brands/") ? f.link.slice("/brands/".length) : null,
      logoUrl: null,
    })),
  });
}
