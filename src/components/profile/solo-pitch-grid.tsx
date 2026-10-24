"use client";

import { useState } from "react";
import { StandaloneSoloPitchFeed } from "@/components/profile/standalone-solo-pitch-feed";
import type { FeedSoloPitch } from "@/lib/feed";

// Phase 32: forces the browser to actually decode and show a frame instead
// of a solid black rectangle — `preload="metadata"` alone only guarantees
// duration/dimensions, not a rendered frame, in every browser. Seeking a
// hair into the clip once metadata is known is the standard trick.
function showFirstFrame(video: HTMLVideoElement) {
  if (video.readyState >= 1) video.currentTime = 0.1;
  else
    video.addEventListener("loadedmetadata", () => (video.currentTime = 0.1), {
      once: true,
    });
}

/**
 * Phase 30/32: a tile grid of muted video thumbnails — clicking one opens
 * the exact same full-screen FeedSoloPitchCard the main feed uses (Luca:
 * "muss genau gleich aussehen wie im Feed").
 *
 * Phase 43: used to open a single static post with no way onward (Luca:
 * "kann nicht swipen sondern nur dieses eine Video schauen") — now opens
 * StandaloneSoloPitchFeed, a real scrollable stack of every video in this
 * grid landing on the tapped one, same fix as the Duelle tab got in Phase 40.
 */
export function SoloPitchGrid({
  initialPitches,
  isLoggedIn,
  viewerBrandId,
}: {
  initialPitches: FeedSoloPitch[];
  isLoggedIn: boolean;
  viewerBrandId?: string | null;
}) {
  const [pitches, setPitches] = useState(initialPitches);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {pitches.map((pitch, index) => (
          <li key={pitch.soloPitchId}>
            <button
              onClick={() => setOpenIndex(index)}
              className="block w-full"
            >
              {/* Luca 24.10.: eigenes Titelbild, sonst das erste Bild des Videos. */}
              {pitch.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
                <img
                  src={pitch.thumbnailUrl}
                  alt=""
                  className="aspect-[9/16] w-full rounded-lg bg-black object-cover"
                />
              ) : (
                <video
                  ref={(el) => {
                    if (el) showFirstFrame(el);
                  }}
                  src={pitch.videoUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="aspect-[9/16] w-full rounded-lg bg-black object-cover"
                />
              )}
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <StandaloneSoloPitchFeed
          pitches={pitches}
          startIndex={openIndex}
          isLoggedIn={isLoggedIn}
          viewerBrandId={viewerBrandId}
          onClose={() => setOpenIndex(null)}
          onPitchUpdated={(soloPitchId, patch) =>
            setPitches((prev) =>
              prev.map((p) =>
                p.soloPitchId === soloPitchId ? { ...p, ...patch } : p,
              ),
            )
          }
          onPitchDeleted={(soloPitchId) =>
            setPitches((prev) =>
              prev.filter((p) => p.soloPitchId !== soloPitchId),
            )
          }
        />
      )}
    </>
  );
}
