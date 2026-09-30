import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOptionalUser } from "@/lib/session";
import { getChallengeDetails } from "@/lib/creator-challenge";
import { SoloPitchUploadForm } from "@/components/pitches/solo-pitch-upload-form";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const details = await getChallengeDetails(id, null).catch(() => null);
  if (!details) return {};
  return { title: `Creator-Challenge ${details.brand.name} (${details.periodLabel}) — MarkItch`, description: details.challenge.prompt };
}

/**
 * RN-7 (Luca 30.09.): Creator-Challenge — eine Marke eröffnet sie für einen
 * Monat, ihre Creator reichen normale Posts ein (laufen im Feed), die
 * Rangliste sind die Likes, nach Monatsende die Top 3.
 */
export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getOptionalUser();
  const details = await getChallengeDetails(id, viewer?.id ?? null).catch(() => null);
  if (!details) notFound();
  const { brand, entries, stage } = details;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <p className="mb-1 text-xs uppercase tracking-wide text-orange-500">Creator-Challenge</p>
      <div className="mb-2 flex items-center gap-2">
        <Link href={`/brands/${brand.slug}`} className="text-lg font-bold text-white hover:underline">
          {brand.name}
        </Link>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
          {details.periodLabel} · {stage === "running" ? "läuft" : stage === "upcoming" ? "startet bald" : "beendet"}
        </span>
      </div>
      <p className="mb-6 text-sm text-zinc-300">{details.challenge.prompt}</p>

      {stage === "finished" && entries.length > 0 && (
        <p className="mb-6 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          🥇 Creator Winner {details.periodLabel}: {entries[0].brandName}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="mb-6 text-sm text-zinc-500">Noch keine Einreichungen.</p>
      ) : (
        <ol className="mb-6 space-y-2">
          {entries.map((e, i) => (
            <li key={e.soloPitchId}>
              <Link
                href={`/?pitch=${e.soloPitchId}`}
                className="flex items-center justify-between rounded-lg border border-zinc-800 p-3 hover:border-zinc-600"
              >
                <span className="text-sm text-white">
                  {i < 3 ? MEDALS[i] : `${i + 1}.`} {e.brandName}
                  {e.description ? <span className="ml-2 text-zinc-500">{e.description}</span> : null}
                </span>
                <span className="text-xs text-zinc-400">🤍 {e.likeCount}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {details.canSubmit && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Mitmachen</h2>
          <SoloPitchUploadForm challengeId={details.challenge.id} />
        </div>
      )}
      {details.isOwner && (
        <p className="mt-6 text-center text-xs text-zinc-500">
          Deine Challenge — Creator reichen hier ein, die Rangliste ergibt sich aus den Likes im Feed.
        </p>
      )}
    </div>
  );
}
