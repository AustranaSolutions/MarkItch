import { ImageResponse } from "next/og";
import { getBattleById, resolveBattleVideos } from "@/lib/battle";
import { getBattleStage } from "@/lib/battle-stage";
import { getVoteTally, getVoteTallyAsOf } from "@/lib/vote";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#09090b";
const ORANGE = "#f97316";
const ZINC = "#3f3f46";
const ZINC_LIGHT = "#a1a1aa";

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          color: ORANGE,
          fontSize: 72,
          fontWeight: 800,
        }}
      >
        MarkItch
      </div>
    ),
    size,
  );
}

/**
 * Phase 17: the "Ergebnis-Grafik" — an auto-generated preview image for
 * every battle share link (/battles/[id]), live or finished. Crawlers
 * (WhatsApp/Twitter/Discord/iMessage link unfurling) fetch this directly,
 * independent of what the page itself does when a human opens the link —
 * see page.tsx for why a live/awaiting battle redirects there but still
 * gets a sensible image here.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const battle = await getBattleById(id);
  if (!battle) return fallbackImage();

  const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
  const liveTally = await getVoteTally(battle.id, battle.brandAId, battle.brandBId);
  const stage = getBattleStage(
    {
      brandAId: battle.brandAId,
      brandBId: battle.brandBId,
      hasVideoA: Boolean(videoUrlA),
      hasVideoB: Boolean(videoUrlB),
      productionDeadline: battle.productionDeadline,
      votingEndsAt: battle.votingEndsAt,
    },
    liveTally,
  );
  const isFinished = stage.stage === "finished" && stage.resolution === "voted";
  const tally =
    isFinished && battle.votingEndsAt
      ? await getVoteTallyAsOf(battle.id, battle.brandAId, battle.brandBId, battle.votingEndsAt)
      : liveTally;

  const pctA = tally.total > 0 ? Math.round((tally.brandAVotes / tally.total) * 100) : 50;
  const pctB = 100 - pctA;
  const winner = isFinished && tally.brandAVotes !== tally.brandBVotes ? (tally.brandAVotes > tally.brandBVotes ? "A" : "B") : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: "white",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: ORANGE }}>MarkItch</div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 12 }}>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: winner === "A" ? ORANGE : "white" }}>
              {battle.brandA.name}
            </div>
            {winner === "A" && <div style={{ display: "flex", fontSize: 30 }}>🏆 Gewinner</div>}
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: ZINC_LIGHT }}>VS</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 12 }}>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: winner === "B" ? ORANGE : "white" }}>
              {battle.brandB.name}
            </div>
            {winner === "B" && <div style={{ display: "flex", fontSize: 30 }}>🏆 Gewinner</div>}
          </div>
        </div>

        {/* Blind-Abstimmen: Balken/Prozente nur für beendete Duelle. Vorher
            zeigte die Vorschau beim Teilen eines laufenden Duells, wer gerade
            führt — genau der Mitläufer-Effekt, den die Regel verhindern soll. */}
        {isFinished ? (
          <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <div style={{ display: "flex", width: "100%", height: 28, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", width: `${pctA}%`, background: ORANGE }} />
              <div style={{ display: "flex", width: `${pctB}%`, background: ZINC }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 700, marginTop: 14 }}>
              <div style={{ display: "flex" }}>{pctA}%</div>
              <div style={{ display: "flex" }}>{pctB}%</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", fontSize: 34, fontWeight: 700, color: ORANGE }}>
            Wer gewinnt? Jetzt abstimmen
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", fontSize: 24, color: ZINC_LIGHT, marginTop: 32 }}>
          {isFinished ? `${tally.total} Stimmen · Ergebnis` : `${tally.total} Stimmen bisher · läuft noch`}
        </div>
      </div>
    ),
    size,
  );
}
