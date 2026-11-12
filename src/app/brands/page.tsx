import { desc } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getTrendingSoloPitches } from "@/lib/feed";
import { TrendingStrip } from "@/components/brand/trending-strip";
import { BrandSearchGrid } from "@/components/brand/brand-search-grid";
import { getT } from "@/lib/lang";

// Always live data — same reasoning as /pitches: no dynamic API is used
// here otherwise, so Next would prerender this once at build time and
// never show a brand created after the last deploy.
export const dynamic = "force-dynamic";

/**
 * Phase 28: this is now the bottom nav's "Suche" tab (was "Marken") —
 * Instagram's magnifying-glass convention combines a search bar with a
 * trending/Explore strip, rather than being a plain static list.
 */
export default async function BrandsPage() {
  const t = await getT();
  const [allBrands, trending] = await Promise.all([
    db.select().from(brands).orderBy(desc(brands.createdAt)),
    getTrendingSoloPitches(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">{t("Suche", "Search")}</h1>

      <TrendingStrip pitches={trending} />

      {allBrands.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Noch keine Marken registriert.", "No brands registered yet.")}</p>
      ) : (
        <BrandSearchGrid brands={allBrands} />
      )}
    </div>
  );
}
