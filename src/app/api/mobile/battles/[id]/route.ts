import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getBattleById, resolveBattleVideos } from "@/lib/battle";
import { getBattleStage } from "@/lib/battle-stage";
import { getVoteTally } from "@/lib/vote";
import { isUuid } from "@/lib/mobile-auth";

/**
 * RN-5b: Wartezimmer eines Duells (Gegenstück zu /pitches/[id]). Läuft das
 * Duell schon (Abstimmen/beendet mit Abstimmung), meldet `stage` das — die
 * App öffnet dann die Feed-Karte statt dieser Seite, wie der Redirect im Web.
 * Videos werden hier nie herausgegeben (verdeckt bis beide geliefert haben).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const battle = isUuid(id) ? await getBattleById(id) : null;
  if (!battle) return NextResponse.json({ error: "Dieses Duell gibt es nicht." }, { status: 404 });

  const viewer = await getOptionalUser();
  const viewerBrand = viewer ? await getBrandForUser(viewer.id) : null;
  const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
  const tally = await getVoteTally(battle.id, battle.brandAId, battle.brandBId);
  const stage = getBattleStage(
    {
      brandAId: battle.brandAId,
      brandBId: battle.brandBId,
      hasVideoA: Boolean(videoUrlA),
      hasVideoB: Boolean(videoUrlB),
      productionDeadline: battle.productionDeadline,
      votingEndsAt: battle.votingEndsAt,
    },
    tally,
  );

  const mySide = viewerBrand?.id === battle.brandAId ? "A" : viewerBrand?.id === battle.brandBId ? "B" : null;
  const brand = (b: { name: string; slug: string; logoUrl: string | null }) => ({ name: b.name, slug: b.slug, logoUrl: b.logoUrl });

  return NextResponse.json({
    id: battle.id,
    category: battle.category,
    brandA: brand(battle.brandA),
    brandB: brand(battle.brandB),
    stage:
      stage.stage === "awaiting_videos"
        ? {
            stage: "awaiting_videos",
            waitingOn: stage.waitingOnBrandIds.map((bid) => (bid === battle.brandAId ? "A" : "B")),
            deadline: stage.deadline?.toISOString() ?? null,
          }
        : stage.stage === "voting"
          ? { stage: "voting" }
          : {
              stage: "finished",
              resolution: stage.resolution,
              winner: stage.winnerBrandId === battle.brandAId ? "A" : stage.winnerBrandId === battle.brandBId ? "B" : null,
            },
    mySide,
    myVideoSubmitted: mySide === "A" ? Boolean(videoUrlA) : mySide === "B" ? Boolean(videoUrlB) : false,
  });
}
