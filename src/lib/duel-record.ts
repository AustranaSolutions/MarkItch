import type { FeedDuel } from "@/lib/feed";

/** Luca 22.10.: Siegbilanz — nur Duelle mit offiziellem Ergebnis (Abstimmung beendet, mindestens eine Stimme). */
export function duelRecord(duels: FeedDuel[], brandId: string): { won: number; decided: number } {
  let won = 0;
  let decided = 0;
  for (const duel of duels) {
    const tally = duel.officialTally;
    if (!duel.isFinished || !tally || tally.total === 0) continue;
    decided += 1;
    const ownIsA = duel.sides[0].brandId === brandId;
    const own = ownIsA ? tally.brandAVotes : tally.brandBVotes;
    const other = ownIsA ? tally.brandBVotes : tally.brandAVotes;
    if (own > other) won += 1;
  }
  return { won, decided };
}
