import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCastingById } from "@/lib/casting";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { SubmissionUploadForm } from "@/components/casting/submission-upload-form";
import { CastingVoteList } from "@/components/casting/casting-vote-list";
import { getT } from "@/lib/lang";
import { type Translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const casting = await getCastingById(id, null);
  if (!casting) return {};
  return {
    title: `Partner-Casting: ${casting.hostBrand.name} — MarkItch`,
    description: casting.prompt,
  };
}

function timeLeftLabel(date: Date, t: Translate): string {
  const hoursLeft = Math.max(0, (date.getTime() - Date.now()) / (60 * 60 * 1000));
  if (hoursLeft >= 24) return t(`noch ${Math.ceil(hoursLeft / 24)} Tage`, `${Math.ceil(hoursLeft / 24)} days left`);
  return t(`noch ${Math.max(1, Math.ceil(hoursLeft))}h`, `${Math.max(1, Math.ceil(hoursLeft))}h left`);
}

/**
 * Phase 19: Partner-Casting — a brand's open call for other brands
 * (creators/influencers running their own profile here) to pitch for
 * becoming their next official partner, decided by community vote. See
 * src/lib/casting.ts for the three-stage lifecycle (open for submissions →
 * voting → finished) and CLAUDE-CODE-UEBERGABE.md's Ideen-Backlog for the
 * product idea this implements.
 */
export default async function CastingPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const viewer = await getOptionalUser();
  const casting = await getCastingById(id, viewer?.id ?? null);
  if (!casting) notFound();

  const viewerBrand = viewer ? await getBrandForUser(viewer.id) : null;
  const isHost = viewerBrand?.id === casting.hostBrandId;
  const hasSubmitted = viewerBrand ? casting.submissions.some((s) => s.brandId === viewerBrand.id) : false;
  const canSubmit =
    Boolean(viewerBrand) && !isHost && !hasSubmitted && casting.stage.stage === "open";
  const canVote =
    Boolean(viewer) &&
    !isHost &&
    !hasSubmitted &&
    (casting.stage.stage === "open" || casting.stage.stage === "voting");
  const winnerBrandId = casting.stage.stage === "finished" ? casting.stage.winnerBrandId : null;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <p className="mb-1 text-xs uppercase tracking-wide text-orange-500">Partner-Casting</p>
      <div className="mb-2 flex items-center gap-2">
        <Link href={`/brands/${casting.hostBrand.slug}`} className="text-lg font-bold text-white hover:underline">
          {casting.hostBrand.name}
        </Link>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
          {casting.stage.stage === "open" && `${t("Einreichen", "Submissions")}: ${timeLeftLabel(casting.stage.deadline, t)}`}
          {casting.stage.stage === "voting" && `${t("Abstimmen", "Voting")}: ${timeLeftLabel(casting.stage.endsAt, t)}`}
          {casting.stage.stage === "finished" && t("Beendet", "Ended")}
        </span>
      </div>
      <p className="mb-6 text-sm text-zinc-300">{casting.prompt}</p>

      {casting.stage.stage === "finished" && (
        <p className="mb-6 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {winnerBrandId
            ? t("Das Casting ist entschieden — die Community hat gewählt.", "The casting is decided — the community has voted.")
            : casting.submissions.length === 0
              ? t("Niemand hat eingereicht — dieses Casting kam nicht zustande.", "Nobody submitted — this casting didn’t happen.")
              : t("Unentschieden — keine Marke hat die meisten Stimmen für sich allein.", "Tie — no brand has the most votes on its own.")}
        </p>
      )}

      {casting.submissions.length === 0 ? (
        <p className="mb-6 text-sm text-zinc-500">{t("Noch keine Einreichungen.", "No submissions yet.")}</p>
      ) : (
        <CastingVoteList
          castingId={casting.id}
          initialSubmissions={casting.submissions}
          initialViewerVotedSubmissionId={casting.viewerVotedSubmissionId}
          isLoggedIn={Boolean(viewer)}
          canVote={canVote}
          winnerBrandId={winnerBrandId}
        />
      )}

      {canSubmit && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">{t("Dein Video einreichen", "Submit your video")}</h2>
          <SubmissionUploadForm castingId={casting.id} />
        </div>
      )}
      {isHost && casting.stage.stage !== "finished" && (
        <p className="mt-6 text-center text-xs text-zinc-500">{t("Das ist dein eigenes Casting — du kannst nicht selbst mitmachen oder abstimmen.", "This is your own casting — you can’t take part or vote yourself.")}</p>
      )}
    </div>
  );
}
