"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ReactionRow, ReactionSeries } from "@/lib/reaction-threads";
import { useT } from "@/components/i18n/lang-provider";

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
  series = [],
  originalBrandName,
  onOpenSeries,
}: {
  /** Luca 19.11.: Serien → Reiter „Reaktionen“ / „Serie“ (ohne Serie keine Reiter). */
  series?: ReactionSeries[];
  originalBrandName?: string | null;
  onOpenSeries?: (seriesRootId: string, chainIndex: number) => void;
  topLevel: ReactionRow[];
  replyCountById: Map<string, number>;
  canPostReaction: boolean;
  onClose: () => void;
  onOpenReaction: (reactionId: string) => void;
  onPostNew: () => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<"reactions" | "series">("reactions");
  const hasSeries = series.length > 0;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <h2 className="text-sm font-semibold text-white">{t("Reaktionen", "Reactions")}</h2>
        <button onClick={onClose} aria-label={t("Schließen", "Close")} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
          <X size={18} />
        </button>
      </div>

      {hasSeries && (
        <div className="mb-2 flex border-b border-zinc-800">
          {(
            [
              ["reactions", t(`Reaktionen (${topLevel.length})`, `Reactions (${topLevel.length})`)],
              ["series", t(`Serie (${series.length})`, `Series (${series.length})`)],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px flex-1 border-b-2 py-2.5 text-center text-sm ${tab === key ? "border-orange-500 font-semibold text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {hasSeries && tab === "series" ? (
        <div className="flex-1 overflow-y-auto px-2 pb-8">
          {series.map((x) => (
            <section key={x.root.id} className="mb-6">
              <p className="mb-2 truncate px-1 text-sm font-bold text-white">
                {originalBrandName ? `${originalBrandName} ⇄ ` : ""}
                {x.root.brand?.name ?? x.root.community?.name}
                <span className="font-normal text-zinc-500">{`  ·  ${x.chain.length} Videos`}</span>
              </p>
              <ul className="grid grid-cols-3 gap-1">
                {x.chain.map((r, i) => (
                  <li key={r.id}>
                    <Tile reaction={r} label={r.brand?.name ?? r.community?.name ?? ""} badge={i === 0 ? t("Reaktion", "Reaction") : t(`Antwort ${i}`, `Reply ${i}`)} onClick={() => onOpenSeries?.(x.root.id, i)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-sm text-zinc-500">
            {hasSeries ? t("Alle Reaktionen sind gerade in einer Serie.", "All reactions are part of a series right now.") : t("Noch keine Reaktionen — sei die erste Marke.", "No reactions yet — be the first brand.")}
          </p>
          {canPostReaction && (
            <button onClick={onPostNew} className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500">
              {t("Reaktion posten", "Post reaction")}
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
                    {/* Luca 02.11.: eigenes Titelbild, sonst das erste Bild des Videos. */}
                    {reaction.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
                      <img src={reaction.thumbnailUrl} alt="" className="aspect-[9/16] w-full rounded-lg bg-black object-cover" />
                    ) : (
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
                    )}
                    <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {reaction.brand?.name ?? reaction.community?.name}
                    </span>
                    {replyCount > 0 && (
                      <span className="absolute right-1 top-1 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {replyCount} {replyCount === 1 ? t("Antwort", "reply") : t("Antworten", "replies")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canPostReaction && topLevel.length > 0 && !(hasSeries && tab === "series") && (
        <button
          onClick={onPostNew}
          aria-label={t("Reaktion posten", "Post reaction")}
          className="absolute bottom-6 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-500"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

/** Luca 19.11.: Kachel einer Serie — jedes Video einzeln, mit „Reaktion“/„Antwort n“. */
function Tile({ reaction, label, badge, onClick }: { reaction: ReactionRow; label: string; badge: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative block w-full">
      {reaction.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
        <img src={reaction.thumbnailUrl} alt="" className="aspect-[9/16] w-full rounded-lg bg-black object-cover" />
      ) : (
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
      )}
      <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{label}</span>
      <span className="absolute right-1 top-1 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{badge}</span>
    </button>
  );
}
