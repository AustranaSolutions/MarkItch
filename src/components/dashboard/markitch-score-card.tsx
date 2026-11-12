import type { MarkItchScore } from "@/lib/markitch-score";
import { getT, getLang } from "@/lib/lang";
import { localeOf } from "@/lib/i18n";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Luca 03.11.: MarkItch Score in der eigenen Statistik (Website = App,
 * MarkItch-mobile components/stats/markitch-score-card.tsx). Nur die Zahl,
 * keine Aufschlüsselung (kommt später mit den erweiterten Statistiken).
 */
export async function MarkItchScoreCard({ score }: { score: MarkItchScore }) {
  const t = await getT();
  if (!score.unlocked) {
    const duelsLeft = Math.max(0, score.duelsNeeded - score.duels);
    const videosLeft = Math.max(0, score.videosNeeded - score.videos);
    const missing = [duelsLeft ? plural(duelsLeft, t("Duell", "duel"), t("Duelle", "duels")) : null, videosLeft ? plural(videosLeft, t("Video", "video"), t("Videos", "videos")) : null]
      .filter(Boolean)
      .join(t(" und ", " and "));
    return (
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">MarkItch Score</p>
        <p className="mt-2 text-base font-bold text-white">{t(`Noch ${missing} bis zu deinem Score`, `${missing} to go until your score`)}</p>
        <p className="mt-1 text-sm text-zinc-400">
          {t(`Dein Score von 1 bis 10 zeigt, wie gut deine Videos ankommen. Er startet nach ${score.duelsNeeded} Duellen und ${score.videosNeeded} Videos.`, `Your score from 1 to 10 shows how well your videos land. It starts after ${score.duelsNeeded} duels and ${score.videosNeeded} videos.`)}
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <Progress label={t("Duelle", "Duels")} value={score.duels} max={score.duelsNeeded} />
          <Progress label="Videos" value={score.videos} max={score.videosNeeded} />
        </div>
      </div>
    );
  }
  return (
    <div className="mb-8 flex items-center gap-5 rounded-2xl border border-orange-500/35 bg-orange-500/10 p-5">
      <p className="text-5xl font-black tabular-nums text-white">{score.score.toLocaleString(localeOf(await getLang()), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">MarkItch Score</p>
        <p className="mt-1 text-sm text-zinc-300">{t("Wie gut deine Videos ankommen — Duelle, Link-Klicks, Likes, Meinungen und Follower der letzten 90 Tage. Skala 1 bis 10.", "How well your videos land — duels, link clicks, likes, comments and followers from the last 90 days. Scale of 1 to 10.")}</p>
      </div>
    </div>
  );
}

function Progress({ label, value, max }: { label: string; value: number; max: number }) {
  const done = Math.min(value, max);
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-zinc-400">{label}</span>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className="bg-orange-500" style={{ width: `${(done / max) * 100}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums text-zinc-300">
        {done}/{max}
      </span>
    </div>
  );
}
