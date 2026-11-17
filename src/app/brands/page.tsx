import { desc } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getTrendingSoloPitches } from "@/lib/feed";
import { TrendingStrip } from "@/components/brand/trending-strip";
import { BrandSearchGrid } from "@/components/brand/brand-search-grid";
import { getT } from "@/lib/lang";
import { brandIsDiscoverable } from "@/lib/brand-trust";
import Link from "next/link";
import { ChevronRight, Clapperboard } from "lucide-react";
import { getOpenCastings } from "@/lib/casting";

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
  const [allBrands, trending, castings] = await Promise.all([
    // Luca 13.11. (Phase 4): 60 Tage inaktive Unternehmen nicht mehr vorschlagen.
    db.select().from(brands).where(brandIsDiscoverable()).orderBy(desc(brands.createdAt)),
    getTrendingSoloPitches(),
    getOpenCastings(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">{t("Suche", "Search")}</h1>

      <TrendingStrip pitches={trending} />

      {/* Luca 17.11. (Phasen-Map 4.3): Eingang zu allen offenen Castings. */}
      <Link href="/castings" className="mb-6 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white hover:bg-zinc-900">
          <Clapperboard size={18} className="text-orange-400" />
          <span className="flex-1 font-semibold">{t("Offene Castings", "Open castings")}</span>
          {castings.length > 0 && <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold">{castings.length}</span>}
          <ChevronRight size={16} className="text-zinc-500" />
        </Link>

      {allBrands.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Noch keine Marken registriert.", "No brands registered yet.")}</p>
      ) : (
        <BrandSearchGrid brands={allBrands} />
      )}
    </div>
  );
}
