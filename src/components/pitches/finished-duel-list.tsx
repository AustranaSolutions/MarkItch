"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { StandaloneDuelFeed } from "@/components/profile/standalone-duel-feed";
import { TileViews } from "@/components/profile/tile-views";
import type { FeedDuel } from "@/lib/feed";
import { useT } from "@/components/i18n/lang-provider";

// Luca 16.11. (3.3): Reiter „Beendet“ wie in der App — Kacheln in 2 Spalten,
// Sieger links mit Pokal und goldenem Rand, darunter „Name · 90 %“. Antippen
// öffnet das Duell beim Sieger, Wischen zeigt die nächsten beendeten Duelle.

const GOLD = "#f5c542";

type Winner = { side: 0 | 1; name: string; votes: number; total: number } | "tie" | null;

/** Offizielle Zählung (beim Fristende eingefroren), sonst die laufende. */
function duelWinner(duel: FeedDuel): Winner {
  const tally = duel.officialTally ?? duel.tally;
  if (tally.total === 0) return null;
  if (tally.brandAVotes === tally.brandBVotes) return "tie";
  const side = tally.brandAVotes > tally.brandBVotes ? 0 : 1;
  return { side, name: duel.sides[side].brandName, votes: side === 0 ? tally.brandAVotes : tally.brandBVotes, total: tally.total };
}

export function FinishedDuelList({ duels, isLoggedIn }: { duels: FeedDuel[]; isLoggedIn: boolean }) {
  const t = useT();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (duels.length === 0) return <p className="text-sm text-zinc-500">{t("Noch kein Duell beendet.", "No duel has ended yet.")}</p>;

  const withLead = duels.map((d) => {
    const w = duelWinner(d);
    return w && w !== "tie" ? { ...d, leadBrandId: d.sides[w.side].brandId } : d;
  });

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-3">
        {duels.map((duel, index) => {
          const w = duelWinner(duel);
          const winnerSide = w && w !== "tie" ? w.side : null;
          const sides = winnerSide === 1 ? [duel.sides[1], duel.sides[0]] : duel.sides;
          return (
            <li key={duel.key}>
              <button
                onClick={() => setOpenIndex(index)}
                className="relative flex aspect-[4/5] w-full gap-0.5 overflow-hidden rounded-xl"
                aria-label={t(`Duell ${duel.sides[0].brandName} gegen ${duel.sides[1].brandName}`, `Duel ${duel.sides[0].brandName} vs. ${duel.sides[1].brandName}`)}
              >
                {sides.map((side, pos) => (
                  <span key={side.brandId} className="relative h-full flex-1 bg-zinc-900">
                    {side.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
                      <img src={side.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video src={`${side.videoUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    )}
                    {pos === 0 && winnerSide !== null && (
                      // Goldener Rand als eigene Ebene über dem Bild (sonst verdeckt es ihn).
                      <span className="pointer-events-none absolute inset-0 rounded-l-xl border-2" style={{ borderColor: GOLD }} />
                    )}
                    {pos === 0 && winnerSide !== null && (
                      <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60">
                        <Trophy size={13} color={GOLD} />
                      </span>
                    )}
                  </span>
                ))}
                <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-orange-500 bg-[#06171b] text-[11px] font-extrabold text-orange-500">
                  VS
                </span>
                <TileViews count={duel.viewCount} className="right-2" />
              </button>
              {w === "tie" ? (
                <p className="mt-1.5 truncate text-xs text-zinc-500">{t("Unentschieden", "Tie")}</p>
              ) : w ? (
                <p className="mt-1.5 flex items-center gap-1 truncate text-xs font-semibold" style={{ color: GOLD }}>
                  <Trophy size={12} /> <span className="truncate">{w.name} · {Math.round((w.votes / w.total) * 100)} %</span>
                </p>
              ) : (
                <p className="mt-1.5 truncate text-xs text-zinc-500">{t("Keine Stimmen", "No votes")}</p>
              )}
            </li>
          );
        })}
      </ul>
      {openIndex !== null && <StandaloneDuelFeed duels={withLead} startIndex={openIndex} isLoggedIn={isLoggedIn} onClose={() => setOpenIndex(null)} />}
    </>
  );
}
