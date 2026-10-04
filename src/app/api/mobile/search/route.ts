import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getTrendingSoloPitches, searchSoloPitches } from "@/lib/feed";
import { getOptionalUser } from "@/lib/session";

// RN-5: Suche-Tab der App — Trending-Leiste + alle Marken wie /brands im
// Web. Gefiltert wird in der App (wie BrandSearchGrid), bei der aktuellen
// Markenzahl günstiger als eine Anfrage pro Tastendruck.
// Mit `?q=` (Luca 03.10.): stattdessen passende Videos (Produkte/Leistungen).
export async function GET(request: NextRequest) {
  const viewer = await getOptionalUser();
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  if (q) {
    return NextResponse.json({ videos: await searchSoloPitches(viewer?.id ?? null, q) });
  }
  const [allBrands, trending] = await Promise.all([
    db
      .select({
        id: brands.id,
        slug: brands.slug,
        name: brands.name,
        category: brands.category,
        description: brands.description,
        logoUrl: brands.logoUrl,
        verifiedAt: brands.verifiedAt,
      })
      .from(brands)
      .orderBy(desc(brands.createdAt)),
    getTrendingSoloPitches(12, viewer?.id ?? null),
  ]);
  return NextResponse.json({
    brands: allBrands.map(({ verifiedAt, ...b }) => ({ ...b, verified: verifiedAt !== null })),
    trending,
  });
}
