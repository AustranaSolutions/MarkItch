import "server-only";
import { getAllBattles, resolveBattleVideos, type BattleWithBrands } from "@/lib/battle";
import { getBattleStage } from "@/lib/battle-stage";

export type UpcomingBattle = { battle: BattleWithBrands; deadline: Date | null };

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
    if (stage.stage === "awaiting_videos") upcoming.push({ battle, deadline: stage.deadline });
  }
  return upcoming;
}
