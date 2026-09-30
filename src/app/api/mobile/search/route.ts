import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getTrendingSoloPitches } from "@/lib/feed";

// RN-5: Suche-Tab der App — Trending-Leiste + alle Marken wie /brands im
// Web. Gefiltert wird in der App (wie BrandSearchGrid), bei der aktuellen
// Markenzahl günstiger als eine Anfrage pro Tastendruck.
export async function GET() {
  const [allBrands, trending] = await Promise.all([
    db
      .select({
        id: brands.id,
        slug: brands.slug,
        name: brands.name,
        category: brands.category,
        description: brands.description,
        logoUrl: brands.logoUrl,
      })
      .from(brands)
      .orderBy(desc(brands.createdAt)),
    getTrendingSoloPitches(),
  ]);
  return NextResponse.json({ brands: allBrands, trending });
}
