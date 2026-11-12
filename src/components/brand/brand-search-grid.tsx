"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useT } from "@/components/i18n/lang-provider";

export type SearchableBrand = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  logoUrl: string | null;
};

// Phase 28: client-side filter over the already-loaded brand list — plenty
// fast at this scale (a full server round trip per keystroke would be
// overkill), matches name/category/description so "sucht nach Produkten,
// Leistungen oder Beschreibungen" (a brand's description is where that
// lives today, see brand.ts) actually finds something.
export function BrandSearchGrid({ brands }: { brands: SearchableBrand[] }) {
  const t = useT();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q),
    );
  }, [brands, query]);

  return (
    <div>
      <div className="relative mb-6">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Marken, Produkte, Leistungen suchen…", "Search brands, products, services…")}
          className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Keine Treffer für", "No results for")} „{query}“.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {filtered.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/brands/${brand.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center hover:border-zinc-600"
              >
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
                  <img src={brand.logoUrl} alt={brand.name} className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-800 text-2xl font-bold text-zinc-500">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-white">{brand.name}</span>
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400">
                  {brand.category}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
