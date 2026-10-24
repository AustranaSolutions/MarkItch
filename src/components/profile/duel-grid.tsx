"use client";

import { useState } from "react";
import { StandaloneDuelFeed } from "@/components/profile/standalone-duel-feed";
import type { FeedDuel } from "@/lib/feed";

// Phase 38: same seek-a-hair-in trick as SoloPitchGrid's thumbnails —
// `preload="metadata"` alone often only guarantees duration/dimensions, not
// an actually rendered (visible) frame.
function showFirstFrame(video: HTMLVideoElement) {
  if (video.readyState >= 1) video.currentTime = 0.1;
  else video.addEventListener("loadedmetadata", () => (video.currentTime = 0.1), { once: true });
}

/**
 * Phase 38: the profile grid's "Duelle" tab — a brand's own live/finished
 * battles, shown with *its own* side's video as the thumbnail.
 *
 * Phase 40: Luca's report — a tile used to deep-link into the *global*
 * feed (`/?battle=<id>`), which dropped the viewer out of this profile
 * entirely. Now opens StandaloneDuelFeed instead — same real FeedDuelCard,
 * full like/vote/comment/share, but its own scrollable stack limited to
 * this brand's own duels, staying on the profile like the "Videos" tab's
 * SoloPitchGrid already does.
 */
export function DuelGrid({ duels, isLoggedIn, ownBrandId }: { duels: FeedDuel[]; isLoggedIn: boolean; ownBrandId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {/* Luca 24.10.: zweispaltig, beide Titelbilder, dazwischen nur „VS“; Punkt = läuft gerade. */}
      <ul className="grid grid-cols-2 gap-2">
        {duels.map((duel, index) => {
          // Eigene Seite links.
          const sides = duel.sides[1].brandId === ownBrandId ? [duel.sides[1], duel.sides[0]] : duel.sides;
          return (
            <li key={duel.key}>
              <button
                onClick={() => setOpenIndex(index)}
                className="relative flex aspect-[4/5] w-full gap-0.5 overflow-hidden rounded-xl"
                aria-label={`Duell ${sides[0].brandName} gegen ${sides[1].brandName}`}
              >
                {sides.map((side) => (
                  <span key={side.brandId} className="h-full flex-1 bg-zinc-900">
                    {side.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
                      <img src={side.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video
                        ref={(el) => {
                          if (el) showFirstFrame(el);
                        }}
                        src={side.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                ))}
                <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-orange-500 bg-[#06171b] text-[11px] font-extrabold text-orange-500">
                  VS
                </span>
                {!duel.isFinished && <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-orange-500" />}
              </button>
            </li>
          );
        })}
      </ul>

      {openIndex !== null && (
        // Im Vollbild ebenfalls die Seite dieses Profils zuerst (links), Gegner per Wischen.
        <StandaloneDuelFeed duels={duels.map((d) => ({ ...d, leadBrandId: ownBrandId }))} startIndex={openIndex} isLoggedIn={isLoggedIn} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
