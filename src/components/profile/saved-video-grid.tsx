"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import type { FeedItem } from "@/lib/feed";
import { useT } from "@/components/i18n/lang-provider";

// Luca 17.11. (Web wie App 3.1): gemerkte Videos — Antippen öffnet das Video
// im Feed, ✕ nimmt es aus „Für später“.

function Thumb({ thumbnailUrl, videoUrl }: { thumbnailUrl?: string | null; videoUrl: string }) {
  return thumbnailUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
    <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <video src={`${videoUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
  );
}

export function SavedVideoGrid({ items: initial }: { items: FeedItem[] }) {
  const t = useT();
  const [items, setItems] = useState(initial);
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{t("Noch nichts gemerkt. Tippe bei einem Video auf ⋯ › „Für später merken“.", "Nothing saved yet. Tap ⋯ › “Save for later” on a video.")}</p>;
  }
  async function remove(item: FeedItem) {
    const target = item.kind === "solo" ? { targetType: "pitch", targetId: item.soloPitchId } : { targetType: "battle", targetId: item.battleId };
    const res = await fetch("/api/mobile/saved-videos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target) }).catch(() => null);
    if (res?.ok) setItems((prev) => prev.filter((x) => x.key !== item.key));
  }
  return (
    <ul className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <li key={item.key} className="relative">
          <Link
            href={item.kind === "solo" ? `/?pitch=${item.soloPitchId}` : `/?battle=${item.battleId}`}
            className="flex aspect-[9/16] w-full gap-0.5 overflow-hidden rounded-xl bg-zinc-900"
          >
            {item.kind === "solo" ? (
              <Thumb thumbnailUrl={item.thumbnailUrl} videoUrl={item.videoUrl} />
            ) : (
              item.sides.map((side) => (
                <span key={side.brandId} className="h-full flex-1">
                  <Thumb thumbnailUrl={side.thumbnailUrl} videoUrl={side.videoUrl} />
                </span>
              ))
            )}
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-semibold text-white">
              {item.kind === "solo" ? item.brandName : `${item.sides[0].brandName} vs. ${item.sides[1].brandName}`}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => remove(item)}
            aria-label={t("Aus „Für später“ entfernen", "Remove from “Saved for later”")}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={13} />
          </button>
        </li>
      ))}
    </ul>
  );
}
