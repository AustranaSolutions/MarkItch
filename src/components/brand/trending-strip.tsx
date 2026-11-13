import Link from "next/link";
import type { TrendingSoloPitch } from "@/lib/feed";
import { getLang } from "@/lib/lang";
import { socialCount } from "@/lib/i18n";

// Phase 28: Explore-style row (Instagram convention) — each tile deep-links
// into the main Feed already scrolled to that exact Solo-Pitch (the /?pitch=
// mechanism page.tsx already supports for share links/notifications).
export async function TrendingStrip({ pitches }: { pitches: TrendingSoloPitch[] }) {
  if (pitches.length === 0) return null;
  const lang = await getLang();

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">🔥 Trending</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {pitches.map((p) => (
          <Link
            key={p.soloPitchId}
            href={`/?pitch=${p.soloPitchId}`}
            className="relative h-40 w-24 shrink-0 overflow-hidden rounded-lg bg-black"
          >
            <video src={p.videoUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
              <p className="truncate text-[10px] font-semibold text-white">{p.brandName}</p>
              {socialCount(p.likeCount, lang) ? <p className="text-[9px] text-zinc-300">🤍 {socialCount(p.likeCount, lang)}</p> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
