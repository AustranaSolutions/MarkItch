import "server-only";
import { getActiveCastingForBrand, getLatestFinishedCastingForBrand } from "@/lib/casting";
import { periodLabel } from "@/lib/creator-charts";
import { getLivePendingChallengeBetween } from "@/lib/challenge";
import {
  challengeStage,
  getChallengeDetails,
  getLatestFinishedChallengeForBrand,
  getOpenChallengesForBrand,
} from "@/lib/creator-challenge";
import type { PartnerCasting } from "@/db/schema";

/** RN-7: laufende/kommende Creator-Challenge einer Marke fürs Profil. */
export type ProfileChallenge = { id: string; periodLabel: string; prompt: string; stage: "running" | "upcoming" };
/** RN-7: Top 3 der zuletzt beendeten Challenge („Creator Winner …“). */
export type ProfileChallengeWinners = { challengeId: string; periodLabel: string; winners: { name: string; slug: string }[] };

export type BrandProfileExtras = {
  category: string;
  country: string;
  website: string | null;
  challenges: ProfileChallenge[];
  challengeWinners: ProfileChallengeWinners | null;
  activeCasting: PartnerCasting | null;
  castingWinner: { brandName: string; brandSlug: string } | null;
  latestFinishedCastingId: string | null;
  livePending: Awaited<ReturnType<typeof getLivePendingChallengeBetween>>;
};

/**
 * Phase 41: `/profile` (the tab) and `/brands/[slug]` (what a name-click
 * opens) used to each fetch this "everything below the video grid" section
 * separately — they'd already drifted apart once (Phase 32) and did again
 * (`/profile` was quietly missing category/website/Creator-Charts/
 * Partner-Casting entirely). Luca: "der Screen auf Tab Profil muss der
 * selbe sein wie der Screen wenn jemand auf meinen Namen klickt,
 * logischerweise." One shared loader instead of two copies that can drift.
 */
export async function getBrandProfileExtras(
  brand: { id: string; slug: string; category: string; country: string; website: string | null },
  viewerBrandId: string | null,
  isOwnBrand: boolean,
): Promise<BrandProfileExtras> {
  const [activeCasting, livePending, openChallenges, finishedChallenge] = await Promise.all([
    getActiveCastingForBrand(brand.id),
    viewerBrandId && !isOwnBrand ? getLivePendingChallengeBetween(viewerBrandId, brand.id) : Promise.resolve(null),
    getOpenChallengesForBrand(brand.id),
    getLatestFinishedChallengeForBrand(brand.id),
  ]);
  // Top 3 nur für die zuletzt beendete Challenge laden (eine Abfrage mehr, nur wenn es eine gibt).
  const finishedDetails = finishedChallenge ? await getChallengeDetails(finishedChallenge.id, null) : null;
  // Only bother looking up a finished casting's result if there's no
  // active one to show instead — a brand always has at most one relevant
  // casting to display at a time.
  const latestFinishedCasting = activeCasting ? null : await getLatestFinishedCastingForBrand(brand.id);
  const finishedStage = latestFinishedCasting?.stage;
  const winnerBrandId = finishedStage?.stage === "finished" ? finishedStage.winnerBrandId : null;
  const castingWinnerSubmission = winnerBrandId
    ? latestFinishedCasting?.submissions.find((s) => s.brandId === winnerBrandId)
    : null;

  return {
    category: brand.category,
    country: brand.country,
    website: brand.website,
    challenges: openChallenges.map((c) => ({
      id: c.id,
      periodLabel: periodLabel(c.period),
      prompt: c.prompt,
      stage: challengeStage(c.period) === "upcoming" ? ("upcoming" as const) : ("running" as const),
    })),
    challengeWinners:
      finishedDetails && finishedDetails.entries.length > 0
        ? {
            challengeId: finishedDetails.challenge.id,
            periodLabel: finishedDetails.periodLabel,
            winners: finishedDetails.entries.slice(0, 3).map((e) => ({ name: e.brandName, slug: e.brandSlug })),
          }
        : null,
    activeCasting,
    castingWinner: castingWinnerSubmission
      ? { brandName: castingWinnerSubmission.brandName, brandSlug: castingWinnerSubmission.brandSlug }
      : null,
    latestFinishedCastingId: latestFinishedCasting?.id ?? null,
    livePending,
  };
}
