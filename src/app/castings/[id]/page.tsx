import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCastingById } from "@/lib/casting";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { CastingVoteList } from "@/components/casting/casting-vote-list";
import { CastingHostTools } from "@/components/casting/casting-host-tools";
import { CastingPartnerPanel } from "@/components/casting/casting-partner-panel";
import { getCastingPartner, partnerBadgeEnabled } from "@/lib/partner-badge";
import { isAdminEmail } from "@/lib/moderation";
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
  const hoursLeft = (date.getTime() - Date.now()) / (60 * 60 * 1000);
  // Luca 18.11.: vergangene Frist nie als „noch 1h“ zeigen.
  if (hoursLeft <= 0) return t("endet gerade", "ending now");
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
  const canVote =
    Boolean(viewer) &&
    !isHost &&
    !hasSubmitted &&
    (casting.stage.stage === "open" || casting.stage.stage === "voting");
  const winnerBrandId = casting.stage.stage === "finished" ? casting.stage.winnerBrandId : null;
  // Luca 20.11. (7.5): Partner-Abzeichen (nur mit PARTNER_BADGE_ENABLED=1).
  const partner = await getCastingPartner(casting.id);
  const canChoosePartner = partnerBadgeEnabled() && isHost && casting.stage.stage === "finished" && !partner && casting.submissions.length > 0;

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
            ? t("Die Community hat abgestimmt — der Favorit ist markiert. Ob und mit wem die Marke zusammenarbeitet, entscheidet sie selbst.", "The community has voted — the favorite is marked. Whether and with whom the brand works is up to the brand.")
            : casting.submissions.length === 0
              ? t("Niemand hat eingereicht — dieses Casting kam nicht zustande.", "Nobody submitted — this casting didn’t happen.")
              : t("Unentschieden — keine Marke hat die meisten Stimmen für sich allein.", "Tie — no brand has the most votes on its own.")}
        </p>
      )}

      <CastingPartnerPanel
        castingId={casting.id}
        hostName={casting.hostBrand.name}
        partner={partner}
        submissions={[...casting.submissions].sort((a, b) => b.voteCount - a.voteCount).map((s) => ({ id: s.id, brandName: s.brandName, voteCount: s.voteCount }))}
        canChoose={canChoosePartner}
        canRequestRemoval={Boolean(partner) && !partner?.removalRequested && (isHost || viewerBrand?.id === partner?.brandId)}
        canDecide={Boolean(partner?.removalRequested) && isAdminEmail(viewer?.email)}
      />

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

      {/* Luca 18.11.: Bewerben (Video einreichen, bei Bedarf Creator-Profil anlegen) läuft in der App — dieselbe Maske wie beim Posten. */}
      {!isHost && !hasSubmitted && casting.stage.stage === "open" && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <p className="mb-3 text-sm text-zinc-400">
            {t("Du willst Partner werden? Bewirb dich in der MarkItch-App mit einem Video — auch ohne Creator-Profil, das legst du dort in einem Schritt an.", "Want to become the partner? Apply with a video in the MarkItch app — even without a creator profile, you can create one there in one step.")}
          </p>
          <Link href="/app" className="inline-block rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-500">
            {t("In der App bewerben", "Apply in the app")}
          </Link>
        </div>
      )}
      {isHost && casting.stage.stage !== "finished" && (
        <CastingHostTools
          castingId={casting.id}
          prompt={casting.prompt}
          canExtend={casting.stage.stage === "open" || casting.submissions.length === 0}
        />
      )}
      {isHost && casting.stage.stage !== "finished" && (
        <p className="mt-6 text-center text-xs text-zinc-500">{t("Das ist dein eigenes Casting — du kannst nicht selbst mitmachen oder abstimmen.", "This is your own casting — you can’t take part or vote yourself.")}</p>
      )}
    </div>
  );
}
