"use client";

import { Plus, X } from "lucide-react";
import type { ReactionRow } from "@/lib/reaction-threads";

function showFirstFrame(video: HTMLVideoElement) {
  if (video.readyState >= 1) video.currentTime = 0.1;
  else video.addEventListener("loadedmetadata", () => (video.currentTime = 0.1), { once: true });
}

/**
 * Phase 40: the reactions overlay's landing screen — a tile grid, same idea
 * as TikTok's sound page ("Kacheln mit den Videos", Luca's own words),
 * instead of dropping straight into a one-by-one scroll from the top.
 * Tapping a tile hands its id to the parent, which switches to the scoped
 * feed starting exactly there. Only top-level reactions get a tile — a
 * reply lives inside its parent's thread, not as its own grid entry.
 */
export function ReactionsGrid({
  topLevel,
  replyCountById,
  canPostReaction,
  onClose,
  onOpenReaction,
  onPostNew,
}: {
  topLevel: ReactionRow[];
  replyCountById: Map<string, number>;
  canPostReaction: boolean;
  onClose: () => void;
  onOpenReaction: (reactionId: string) => void;
  onPostNew: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <h2 className="text-sm font-semibold text-white">Reaktionen</h2>
        <button onClick={onClose} aria-label="Schließen" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
          <X size={18} />
        </button>
      </div>

      {topLevel.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-sm text-zinc-500">Noch keine Reaktionen — sei die erste Marke.</p>
          {canPostReaction && (
            <button onClick={onPostNew} className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500">
              Reaktion posten
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2">
          <ul className="grid grid-cols-3 gap-1">
            {topLevel.map((reaction) => {
              const replyCount = replyCountById.get(reaction.id) ?? 0;
              return (
                <li key={reaction.id}>
                  <button onClick={() => onOpenReaction(reaction.id)} className="relative block w-full">
                    <video
                      ref={(el) => {
                        if (el) showFirstFrame(el);
                      }}
                      src={reaction.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="aspect-[9/16] w-full rounded-lg bg-black object-cover"
                    />
                    <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {reaction.brand?.name ?? reaction.community?.name}
                    </span>
                    {replyCount > 0 && (
                      <span className="absolute right-1 top-1 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {replyCount} {replyCount === 1 ? "Antwort" : "Antworten"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canPostReaction && topLevel.length > 0 && (
        <button
          onClick={onPostNew}
          aria-label="Reaktion posten"
          className="absolute bottom-6 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-500"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
