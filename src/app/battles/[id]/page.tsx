import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getBattleById, resolveBattleVideos } from "@/lib/battle";
import { getBattleStage } from "@/lib/battle-stage";
import { getVoteTally, getVoteTallyAsOf } from "@/lib/vote";
import { ShareResultImageButton } from "@/components/battle/share-result-image-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const battle = await getBattleById(id);
  if (!battle) return {};
  // Audit (Kleinfehler): „Wer hat gewonnen?“ nur, wenn das Duell wirklich vorbei ist.
  const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
  const stage = getBattleStage({
    brandAId: battle.brandAId,
    brandBId: battle.brandBId,
    hasVideoA: Boolean(videoUrlA),
    hasVideoB: Boolean(videoUrlB),
    productionDeadline: battle.productionDeadline,
    votingEndsAt: battle.votingEndsAt,
  });
  const description =
    stage.stage === "finished"
      ? "Wer hat gewonnen? Jetzt auf MarkItch ansehen."
      : stage.stage === "voting"
        ? "Das Duell läuft — schau beide Videos an und stimm mit ab."
        : "Dieses Duell startet bald — sei dabei, wenn es losgeht.";
  return {
    title: `${battle.brandA.name} vs. ${battle.brandB.name} — MarkItch`,
    description,
  };
}

/**
 * Phase 17: the canonical shareable URL for a Duell — every "Teilen" tap in
 * the feed points here now, live or finished (see feed-duel-card.tsx). Its
 * whole job is being a stable link with a good preview card
 * (opengraph-image.tsx in this same folder); a human who actually opens it
 * gets bounced to wherever the battle actually lives — the waiting room or
 * the feed for anything not finished-and-voted, since /pitches/[id]
 * already has that branching logic — and only stays here for the one case
 * worth a dedicated page: a decided result worth looking at and sharing
 * onward.
 */
export default async function BattleResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const battle = await getBattleById(id);
  if (!battle) notFound();

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

  if (stage.stage !== "finished" || stage.resolution !== "voted" || !battle.votingEndsAt) {
    redirect(`/pitches/${battle.id}`);
  }

  const tally = await getVoteTallyAsOf(battle.id, battle.brandAId, battle.brandBId, battle.votingEndsAt);
  const pctA = tally.total > 0 ? Math.round((tally.brandAVotes / tally.total) * 100) : 50;
  const pctB = 100 - pctA;
  const winnerBrandId =
    tally.brandAVotes === tally.brandBVotes ? null : tally.brandAVotes > tally.brandBVotes ? battle.brandAId : battle.brandBId;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-16 text-center">
      <p className="mb-1 text-xs uppercase tracking-wide text-orange-500">Ergebnis</p>
      <h1 className="mb-6 text-2xl font-bold text-white">
        {battle.brandA.name} <span className="text-orange-500">vs</span> {battle.brandB.name}
      </h1>

      <div className="mb-2 flex w-full justify-between text-sm font-semibold">
        <span className={winnerBrandId === battle.brandAId ? "text-orange-400" : "text-zinc-400"}>
          {battle.brandA.name} {winnerBrandId === battle.brandAId && "🏆"}
        </span>
        <span className={winnerBrandId === battle.brandBId ? "text-orange-400" : "text-zinc-400"}>
          {winnerBrandId === battle.brandBId && "🏆"} {battle.brandB.name}
        </span>
      </div>
      <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="bg-orange-500" style={{ width: `${pctA}%` }} />
        <div className="bg-zinc-600" style={{ width: `${pctB}%` }} />
      </div>
      <div className="mb-8 flex w-full justify-between text-sm text-zinc-400">
        <span>{pctA}%</span>
        <span>{pctB}%</span>
      </div>

      <p className="mb-8 text-sm text-zinc-500">{tally.total} {tally.total === 1 ? "Stimme" : "Stimmen"} insgesamt</p>

      <div className="flex w-full flex-col gap-3">
        <Link
          href={`/?battle=${battle.id}`}
          className="w-full rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-500"
        >
          Im Feed ansehen
        </Link>
        <ShareResultImageButton battleId={battle.id} brandAName={battle.brandA.name} brandBName={battle.brandB.name} />
      </div>
    </div>
  );
}
