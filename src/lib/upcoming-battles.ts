import "server-only";
import { getAllBattles, resolveBattleVideos, type BattleWithBrands } from "@/lib/battle";
import { getBattleStage } from "@/lib/battle-stage";

export type UpcomingBattle = { battle: BattleWithBrands; deadline: Date | null; waitingOnBrandIds: string[] };

/**
 * Phase 10: every Duell still waiting on at least one video — the "kommt
 * bald" list of /pitches. RN-5: ausgelagert, damit die App-Route
 * /api/mobile/pitches exakt dieselbe Auswahl zeigt.
 */
export async function getUpcomingBattles(): Promise<UpcomingBattle[]> {
  const battles = await getAllBattles();
  const upcoming: UpcomingBattle[] = [];
  for (const battle of battles) {
    const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
    const stage = getBattleStage({
      brandAId: battle.brandAId,
      brandBId: battle.brandBId,
      hasVideoA: Boolean(videoUrlA),
      hasVideoB: Boolean(videoUrlB),
      productionDeadline: battle.productionDeadline,
      votingEndsAt: battle.votingEndsAt,
    });
    if (stage.stage === "awaiting_videos") {
      upcoming.push({ battle, deadline: stage.deadline, waitingOnBrandIds: stage.waitingOnBrandIds });
    }
  }
  return upcoming;
}

/**
 * Duelle, in denen diese Marke angenommen hat (oder eingeladen wurde und
 * angenommen wurde), ihr eigenes Video aber noch fehlt — der Hinweis „Dein
 * Video für ein Duell fehlt noch“ auf /post. RN-5b: gemeinsam mit der App.
 */
export async function getBattlesAwaitingVideoFrom(brandId: string): Promise<BattleWithBrands[]> {
  const upcoming = await getUpcomingBattles();
  const result: BattleWithBrands[] = [];
  for (const { battle } of upcoming) {
    if (battle.brandAId !== brandId && battle.brandBId !== brandId) continue;
    const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
    const mine = battle.brandAId === brandId ? videoUrlA : videoUrlB;
    if (!mine) result.push(battle);
  }
  return result;
}
