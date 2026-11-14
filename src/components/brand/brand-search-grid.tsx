"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useT } from "@/components/i18n/lang-provider";
import { langOf } from "@/lib/i18n";
import { categoryLabel } from "@/lib/brand-details";

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
  // Luca 13.11. (Phase 5): Stöbern nach Kategorie — nur vorhandene, häufigste zuerst.
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of brands) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [brands]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inCategory = category ? brands.filter((b) => b.category === category) : brands;
    if (!q) return inCategory;
    return inCategory.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q),
    );
  }, [brands, query, category]);

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

      {categories.length > 1 && (
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              onClick={() => setCategory(c)}
              className={
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium " +
                (category === c ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")
              }
            >
              {c ? categoryLabel(c, langOf(t)) : t("Alle Kategorien", "All categories")}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {query.trim() ? `${t("Keine Treffer für", "No results for")} „${query}“.` : t("Keine Profile in dieser Kategorie.", "No profiles in this category.")}
        </p>
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
                  {categoryLabel(brand.category, langOf(t))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
