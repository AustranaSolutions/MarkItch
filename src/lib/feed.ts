import "server-only";
import { after } from "next/server";
import { eq, inArray, or, type SQL } from "drizzle-orm";
import { battles as battlesTable, soloPitches } from "@/db/schema";
import { isUuid } from "@/lib/mobile-auth";
import { getAllBattles, resolveBattleVideos, type BattleWithBrands } from "@/lib/battle";
import { getBattleStage } from "@/lib/battle-stage";
import { getVoteTally, getVoteTallyAsOf, getVoteTotals, getUserVote, publicTally, type VoteTally } from "@/lib/vote";
import { getBattleLikeTotals, getLikeCounts, getUserLikedKeys, getSoloPitchLikeCounts, getUserLikedSoloPitchIds } from "@/lib/like";
import { getCommentCounts, getCommentCountsForSoloPitches } from "@/lib/comment";
import { getFollowedBrandIds } from "@/lib/follow";
import { getBrandForUser } from "@/lib/brand";
import { VOTING_WINDOW_MS } from "@/lib/battle-format";
import { finalizeAndNotifyBattle } from "@/lib/battle-notify";
import { getAllSoloPitches, type SoloPitchWithBrand } from "@/lib/solo-pitch";
import { getReactionCounts } from "@/lib/reaction";
import { getActiveBoostedSoloPitchIds } from "@/lib/boost";
import { getViewCountsForSoloPitches, getViewCountsForBattles } from "@/lib/analytics";
import { getAutoHiddenTargetIds } from "@/lib/moderation";
import { getBlockedIds } from "@/lib/block";
import { getSoloPitchContexts, type PitchContext } from "@/lib/pitch-context";
import {
  enrichCommunityReactions,
  getEligibleCommunityReactions,
  type CommunityReactionRow,
  type FeedReaction,
} from "@/lib/community-feed";

// Phase 9.1 — one feed entry per Duell (battle), not per side.
//
// Phase 9 originally split a battle into two independent feed cards, one
// per video. Product feedback: that breaks the actual point of a Duell —
// a viewer could scroll past brand A's video and never see brand B's, so
// "vote on this" never really happens. A feed entry now IS the Duell:
// `sides[0]`/`sides[1]` (always brandA/brandB, matching tally.brandAVotes/
// brandBVotes) are both loaded, and the client shows exactly one full-
// screen video at a time — same "one video on screen" feel — but lets the
// viewer flip to the other side without leaving this feed position
// (FeedDuelCard's left/right tap zones). Still nothing pre-reveal ever
// shows up: a card only exists once both sides of its battle are visible
// under the existing Phase 7 "hidden results" rule.
export type FeedDuelSide = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  /** Audit 04.10. (C1): vom Betreiber verifizierte Marke. */
  brandVerified: boolean;
  videoUrl: string;
  likeCount: number;
  viewerLiked: boolean;
  /** Hide the follow button on your own brand's side. */
  viewerOwnsThisBrand: boolean;
  viewerFollowsBrand: boolean;
  /** Phase 27: null for content posted before this existed — no fallback here (unlike the counter-flow's reused profile video), a video-upload's own CTA is the real thing. */
  ctaLabel: string | null;
  ctaUrl: string | null;
  /** Phase 46: EU-AI-Act-Kennzeichnungspflicht. */
  containsAiContent: boolean;
};

export type FeedDuel = {
  kind: "duel";
  key: string; // battleId — stable across re-fetches
  battleId: string;
  category: string;
  isFinished: boolean;
  votingEndsAt: string | null; // ISO
  revealSplit: boolean;
  /** Live, ever-growing tally — includes votes cast after votingEndsAt too. Drives the running "N Stimmen bisher" count and trending score. */
  tally: VoteTally;
  /**
   * Phase 12: the tally as it stood at votingEndsAt — this is the "official"
   * result once a Pitch is finished, and it never changes afterwards. Null
   * until the Pitch is actually finished. Compare against `tally` to see
   * whether later votes have since shifted the lead.
   */
  officialTally: VoteTally | null;
  commentCount: number;
  /** Phase 41: both sides combined — see analytics.ts's getViewCountsForBattles. */
  viewCount: number;
  viewerVotedBrandId: string | null;
  /** Viewer's own brand is either side of this Duell — can't vote, no follow button on either side. */
  viewerOwnsThisBattle: boolean;
  activatedAt: string; // ISO — when both sides went live, used for recency
  sides: [FeedDuelSide, FeedDuelSide];
  /** Which side to open on — the viewer's followed brand if there is one, otherwise brand A. */
  initialSideIndex: 0 | 1;
};

// Phase F (H3, Audit 04.10.): Der Feed wurde früher bei jedem Abruf komplett
// gebaut — für jedes Duell und jeden Pitch alle Zählungen (pro Duell sogar
// eigene Abfragen für Stimmen) — und dann nur 6 Einträge verschickt. Jetzt
// zwei Stufen: Stufe 1 lädt nur, was für Sichtbarkeit und Reihenfolge nötig
// ist (Zählungen als je eine gruppierte Abfrage), Stufe 2 reichert nur die
// Einträge der angefragten Seite voll an. Einzelne Duelle/Pitches und
// Marken-Profile filtern schon in der Datenbank.

/** Stufe 1: Duelle, die im Feed stehen dürfen (beide Videos sichtbar, nicht blockiert/pausiert). */
async function getEligibleBattles(viewerId: string | null, where?: SQL): Promise<BattleWithBrands[]> {
  const [allBattles, autoHiddenBattleIds, blocked] = await Promise.all([
    getAllBattles(where),
    getAutoHiddenTargetIds(["battle_a", "battle_b"]),
    getBlockedIds(viewerId),
  ]);
  return allBattles.filter((battle) => {
    // RN-7: Duelle mit einer blockierten Marke sieht der Blockierende nicht.
    if (blocked.brandIds.has(battle.brandAId) || blocked.brandIds.has(battle.brandBId)) return false;
    // Phase 46: mehrere unterschiedliche Meldende → automatisch pausiert
    // bis zur Überprüfung (Rechtskonformitäts-Audit) — siehe
    // getAutoHiddenTargetIds für die Begründung.
    if (autoHiddenBattleIds.has(battle.id)) return false;
    const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
    const stage = getBattleStage({
      brandAId: battle.brandAId,
      brandBId: battle.brandBId,
      hasVideoA: Boolean(videoUrlA),
      hasVideoB: Boolean(videoUrlB),
      productionDeadline: battle.productionDeadline,
      votingEndsAt: battle.votingEndsAt,
    });
    // Only a battle where both real videos are visible belongs in the feed
    // — 'awaiting_videos' is still hidden, and a walkover/no_show never got
    // a second video to show at all.
    const eligible = stage.stage === "voting" || (stage.stage === "finished" && stage.resolution === "voted");
    if (eligible && stage.stage === "finished" && !battle.resultNotifiedAt) {
      // Fire-and-forget, scheduled to run after this response is sent
      // (next/server's after()) — see battle-notify.ts for why this piggy-
      // backs on ordinary feed reads instead of a cron job. Guarded by
      // resultNotifiedAt so this only actually does work once per battle.
      // Phase F: hier in Stufe 1, damit es weiter bei jedem Feed-Abruf
      // greift, nicht nur für Duelle, die gerade auf der Seite landen.
      after(() => finalizeAndNotifyBattle(battle.id).catch((err) => console.error("[battle-notify]", err)));
    }
    return eligible;
  });
}

function activatedAtOf(battle: BattleWithBrands): Date {
  return battle.votingEndsAt ? new Date(battle.votingEndsAt.getTime() - VOTING_WINDOW_MS) : battle.createdAt;
}

/** Stufe 2: volle Feed-Karten (Zählungen, Stimmen, Zuschauer-Status) für genau diese Duelle. */
async function enrichDuels(viewerId: string | null, eligible: BattleWithBrands[]): Promise<FeedDuel[]> {
  if (eligible.length === 0) return [];

  const battleIds = eligible.map((b) => b.id);
  const likeKeys = eligible.flatMap((b) => [
    { battleId: b.id, brandId: b.brandAId },
    { battleId: b.id, brandId: b.brandBId },
  ]);

  const [tallies, officialTallies, commentCounts, likeCounts, viewerLikedKeys, viewerVotes, viewerBrand, followedBrandIds, viewCounts] =
    await Promise.all([
      Promise.all(eligible.map((b) => getVoteTally(b.id, b.brandAId, b.brandBId))),
      // Phase 12: the frozen result at votingEndsAt — null for a battle
      // that's still in its voting window (nothing to freeze yet).
      Promise.all(
        eligible.map((b) =>
          b.votingEndsAt && b.votingEndsAt.getTime() < Date.now()
            ? getVoteTallyAsOf(b.id, b.brandAId, b.brandBId, b.votingEndsAt)
            : Promise.resolve(null),
        ),
      ),
      getCommentCounts(battleIds),
      getLikeCounts(likeKeys),
      viewerId ? getUserLikedKeys(viewerId, likeKeys) : Promise.resolve(new Set<string>()),
      viewerId ? Promise.all(eligible.map((b) => getUserVote(b.id, viewerId))) : Promise.resolve([]),
      viewerId ? getBrandForUser(viewerId) : Promise.resolve(null),
      viewerId ? getFollowedBrandIds(viewerId) : Promise.resolve([]),
      getViewCountsForBattles(battleIds),
    ]);

  const talliesByBattle = new Map(eligible.map((b, i) => [b.id, tallies[i]]));
  const officialTalliesByBattle = new Map(eligible.map((b, i) => [b.id, officialTallies[i]]));
  const viewerVoteByBattle = new Map(eligible.map((b, i) => [b.id, viewerVotes[i] ?? null]));
  const followedSet = new Set(followedBrandIds);

  const duels: FeedDuel[] = [];
  for (const battle of eligible) {
    const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
    if (!videoUrlA || !videoUrlB) continue; // guaranteed by the eligibility filter, kept for type-narrowing
    const tally = talliesByBattle.get(battle.id)!;
    const officialTally = officialTalliesByBattle.get(battle.id) ?? null;
    // The winner is decided from the frozen result, not the live one —
    // votes cast after votingEndsAt count towards `tally` (shown as "the
    // current trend") but must never flip who officially won.
    const stage = getBattleStage(
      {
        brandAId: battle.brandAId,
        brandBId: battle.brandBId,
        hasVideoA: true,
        hasVideoB: true,
        productionDeadline: battle.productionDeadline,
        votingEndsAt: battle.votingEndsAt,
      },
      officialTally ?? tally,
    );
    const isFinished = stage.stage === "finished";
    const activatedAt = activatedAtOf(battle);
    const commentCount = commentCounts.get(battle.id) ?? 0;
    const viewerVotedBrandId = viewerVoteByBattle.get(battle.id) ?? null;
    const viewerOwnsThisBattle = Boolean(
      viewerBrand && (viewerBrand.id === battle.brandAId || viewerBrand.id === battle.brandBId),
    );

    const rawSides: [typeof battle.brandA, typeof battle.brandB] = [battle.brandA, battle.brandB];
    const videoUrls = [videoUrlA, videoUrlB];
    // Phase 27: each side's own CTA if it uploaded one, else that brand's
    // profile website — only the counter-flow's reused profile-video side
    // (see counterWithVideo) is expected to actually need the fallback.
    const ctaLabels = [battle.brandACtaLabel, battle.brandBCtaLabel];
    const ctaUrls = [battle.brandACtaUrl ?? battle.brandA.website, battle.brandBCtaUrl ?? battle.brandB.website];
    const aiContentFlags = [battle.brandAContainsAiContent, battle.brandBContainsAiContent];
    const sides = rawSides.map((brand, i): FeedDuelSide => {
      const key = `${battle.id}:${brand.id}`;
      return {
        brandId: brand.id,
        brandName: brand.name,
        brandSlug: brand.slug,
        brandLogoUrl: brand.logoUrl,
        brandVerified: brand.verifiedAt !== null,
        videoUrl: videoUrls[i]!,
        likeCount: likeCounts.get(key) ?? 0,
        viewerLiked: viewerLikedKeys.has(key),
        viewerOwnsThisBrand: viewerBrand?.id === brand.id,
        viewerFollowsBrand: followedSet.has(brand.id),
        ctaLabel: ctaLabels[i] ?? (ctaUrls[i] ? "Zur Website" : null),
        ctaUrl: ctaUrls[i],
        containsAiContent: aiContentFlags[i]!,
      };
    }) as [FeedDuelSide, FeedDuelSide];

    const initialSideIndex: 0 | 1 = followedSet.has(sides[1].brandId) && !followedSet.has(sides[0].brandId) ? 1 : 0;

    duels.push({
      kind: "duel",
      key: battle.id,
      battleId: battle.id,
      category: battle.category,
      isFinished,
      votingEndsAt: battle.votingEndsAt ? battle.votingEndsAt.toISOString() : null,
      revealSplit: isFinished,
      tally: publicTally(tally, isFinished),
      officialTally,
      commentCount,
      viewCount: viewCounts.get(battle.id) ?? 0,
      viewerVotedBrandId,
      viewerOwnsThisBattle,
      activatedAt: activatedAt.toISOString(),
      sides,
      initialSideIndex,
    });
  }
  return duels;
}

async function buildFeedDuels(viewerId: string | null, where?: SQL): Promise<FeedDuel[]> {
  return enrichDuels(viewerId, await getEligibleBattles(viewerId, where));
}

/**
 * Live-computed, not stored — same philosophy as effectiveStatus()/
 * getBattleStage(): recompute from current counts every time rather than
 * maintain a cached rank that can drift. Small platform, small dataset,
 * this is cheap; a future phase can cache it once that stops being true.
 */
function scoreFromEngagement(engagement: number, ageHours: number): number {
  // +1/+2 keep a brand-new, zero-engagement item from scoring exactly 0 (so
  // it still surfaces, just low) and from dividing by a near-zero age.
  return (engagement + 1) / Math.pow(ageHours + 2, 1.3);
}

// Phase 25: Feed-Personalisierung. A nudge, not an override — a followed
// brand's Duell scores higher than an identical unfollowed one, but a
// genuinely trending unfollowed Duell can still outrank a quiet followed
// one. Keeps "For You" one shared ranking algorithm rather than forking
// into a separate personalized-vs-generic feed (that's what "Folge ich"
// is already for, see getFollowingFeed below).
const FOLLOW_BOOST = 1.5;

/** Phase F (H3): Stufe-1-Daten eines Duells für die Reihenfolge — Zählungen ohne volle Karte. */
type RankedBattle = { battle: BattleWithBrands; likes: number; comments: number; votes: number };

function trendingScoreForDuel(duel: RankedBattle, followedBrandIds: Set<string>): number {
  const ageHours = Math.max(0, (Date.now() - activatedAtOf(duel.battle).getTime()) / (60 * 60 * 1000));
  const engagement = duel.likes * 1 + duel.comments * 1.5 + duel.votes * 2;
  const score = scoreFromEngagement(engagement, ageHours);
  const isFollowed = followedBrandIds.has(duel.battle.brandAId) || followedBrandIds.has(duel.battle.brandBId);
  return isFollowed ? score * FOLLOW_BOOST : score;
}

/** Duelle nach Trend sortiert — Likes, Kommentare und Stimmen als je eine gruppierte Abfrage. */
async function rankBattles(eligible: BattleWithBrands[], followedSet: Set<string>): Promise<BattleWithBrands[]> {
  if (eligible.length === 0) return [];
  const ids = eligible.map((b) => b.id);
  const [likeTotals, commentCounts, voteTotals] = await Promise.all([
    getBattleLikeTotals(ids),
    getCommentCounts(ids),
    getVoteTotals(ids),
  ]);
  const ranked: RankedBattle[] = eligible.map((battle) => ({
    battle,
    likes: likeTotals.get(battle.id) ?? 0,
    comments: commentCounts.get(battle.id) ?? 0,
    votes: voteTotals.get(battle.id) ?? 0,
  }));
  const scores = new Map(ranked.map((r) => [r.battle.id, trendingScoreForDuel(r, followedSet)]));
  return [...eligible].sort((x, y) => scores.get(y.id)! - scores.get(x.id)!);
}

// Phase 13: a solo pitch — every video's starting point, watchable/likable/
// commentable with no opponent required (see CLAUDE-CODE-UEBERGABE.md §6).
// `reactionCount` links onward to the reactions sheet (best-liked first,
// src/lib/reaction.ts); posting a reaction or sending a formal "Pitch
// schicken" challenge both happen from there, not from feed data itself —
// keeping this shape cheap to build for a whole feed page.
export type FeedSoloPitch = {
  kind: "solo";
  key: string; // `solo:${soloPitchId}` — stable across re-fetches
  soloPitchId: string;
  category: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  /** Audit 04.10. (C1): vom Betreiber verifizierte Marke. */
  brandVerified: boolean;
  videoUrl: string;
  /** Phase 30: null only for content posted before this existed. */
  description: string | null;
  likeCount: number;
  viewerLiked: boolean;
  viewerOwnsThisBrand: boolean;
  viewerFollowsBrand: boolean;
  commentCount: number;
  reactionCount: number;
  /** Phase 41: TikTok/Insta always show this — see analytics.ts's getViewCountsForSoloPitches. */
  viewCount: number;
  createdAt: string; // ISO
  /** Phase 26: an active, paid-for ranking bump — see boost.ts. Shown as a small badge to everyone, not just the owner. */
  boosted: boolean;
  /** Phase 27: null only for content posted before this existed. */
  ctaLabel: string | null;
  ctaUrl: string | null;
  /** Phase 46: EU-AI-Act-Kennzeichnungspflicht. */
  containsAiContent: boolean;
  /** RN-7: Einreichung zu einer Creator-Challenge bzw. einem Partner-Casting → Knopf dorthin. */
  context: PitchContext | null;
  /** RN-7: für die Challenge-Seite (Einreichungen filtern). */
  creatorChallengeId: string | null;
};

export type FeedItem = FeedDuel | FeedSoloPitch;
/** Phase E: nur die neue App bekommt auch Community-Reaktionen (Web/ältere App kennen die Art nicht). */
export type FeedItemWithReactions = FeedItem | FeedReaction;

/** Stufe 1: sichtbare Solo-Pitches (nicht blockiert/pausiert), neueste zuerst, ohne Zählungen. */
async function getEligibleSoloPitches(viewerId: string | null, where?: SQL): Promise<SoloPitchWithBrand[]> {
  const [allPitches, autoHiddenIds, blocked] = await Promise.all([
    getAllSoloPitches(where),
    getAutoHiddenTargetIds(["solo_pitch"]),
    getBlockedIds(viewerId),
  ]);
  // Phase 46: siehe getEligibleBattles — mehrere unterschiedliche Meldende → automatisch pausiert.
  // RN-7: dazu alles von blockierten Marken.
  return allPitches.filter((p) => !autoHiddenIds.has(p.id) && !blocked.brandIds.has(p.brandId));
}

/** Stufe 2: volle Feed-Karten für genau diese Solo-Pitches. */
async function enrichSoloPitches(viewerId: string | null, pitches: SoloPitchWithBrand[]): Promise<FeedSoloPitch[]> {
  if (pitches.length === 0) return [];

  const ids = pitches.map((p) => p.id);
  const [likeCounts, commentCounts, reactionCounts, viewerLikedIds, viewerBrand, followedBrandIds, boostedIds, viewCounts, contexts] =
    await Promise.all([
      getSoloPitchLikeCounts(ids),
      getCommentCountsForSoloPitches(ids),
      getReactionCounts(ids),
      viewerId ? getUserLikedSoloPitchIds(viewerId, ids) : Promise.resolve(new Set<string>()),
      viewerId ? getBrandForUser(viewerId) : Promise.resolve(null),
      viewerId ? getFollowedBrandIds(viewerId) : Promise.resolve([]),
      getActiveBoostedSoloPitchIds(ids),
      getViewCountsForSoloPitches(ids),
      getSoloPitchContexts(pitches),
    ]);
  const followedSet = new Set(followedBrandIds);

  return pitches.map((pitch): FeedSoloPitch => ({
    kind: "solo",
    key: `solo:${pitch.id}`,
    soloPitchId: pitch.id,
    category: pitch.category,
    brandId: pitch.brand.id,
    brandName: pitch.brand.name,
    brandSlug: pitch.brand.slug,
    brandLogoUrl: pitch.brand.logoUrl,
    brandVerified: pitch.brand.verifiedAt !== null,
    videoUrl: pitch.videoUrl,
    description: pitch.description,
    likeCount: likeCounts.get(pitch.id) ?? 0,
    viewerLiked: viewerLikedIds.has(pitch.id),
    viewerOwnsThisBrand: viewerBrand?.id === pitch.brand.id,
    viewerFollowsBrand: followedSet.has(pitch.brand.id),
    commentCount: commentCounts.get(pitch.id) ?? 0,
    reactionCount: reactionCounts.get(pitch.id) ?? 0,
    viewCount: viewCounts.get(pitch.id) ?? 0,
    createdAt: pitch.createdAt.toISOString(),
    boosted: boostedIds.has(pitch.id),
    ctaLabel: pitch.ctaLabel,
    ctaUrl: pitch.ctaUrl,
    containsAiContent: pitch.containsAiContent,
    context: contexts.get(pitch.id) ?? null,
    creatorChallengeId: pitch.creatorChallengeId,
  }));
}

async function buildFeedSoloPitches(viewerId: string | null, where?: SQL): Promise<FeedSoloPitch[]> {
  return enrichSoloPitches(viewerId, await getEligibleSoloPitches(viewerId, where));
}

/** RN-7: alle Einreichungen einer Creator-Challenge, meiste Likes zuerst (= Rangliste). */
export async function getFeedSoloPitchesForChallenge(viewerId: string | null, challengeId: string): Promise<FeedSoloPitch[]> {
  if (!isUuid(challengeId)) return [];
  const items = await buildFeedSoloPitches(viewerId, eq(soloPitches.creatorChallengeId, challengeId));
  return items.sort((a, b) => b.likeCount - a.likeCount || a.createdAt.localeCompare(b.createdAt));
}

/**
 * Luca 03.10.: Suche nach Produkten/Leistungen — durchsucht die Videos
 * (Beschreibung, Link-Beschriftung) und als Rückfall Marke/Kategorie.
 * Treffer im Video-Text zuerst, dann nach Likes und Aktualität.
 * Phase F: Text und Likes auf Stufe-1-Daten, angereichert werden nur die Treffer.
 */
export async function searchSoloPitches(viewerId: string | null, rawQuery: string, limit = 30): Promise<FeedSoloPitch[]> {
  const terms = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const pitches = await getEligibleSoloPitches(viewerId);
  const contexts = await getSoloPitchContexts(pitches);
  const matches = pitches.flatMap((p) => {
    const ownText = `${p.description ?? ""} ${p.ctaLabel ?? ""} ${contexts.get(p.id)?.label ?? ""}`.toLowerCase();
    const brandText = `${p.brand.name} ${p.category}`.toLowerCase();
    // Jedes Wort muss irgendwo vorkommen (UND-Suche).
    if (!terms.every((t) => ownText.includes(t) || brandText.includes(t))) return [];
    const ownHits = terms.filter((t) => ownText.includes(t)).length;
    return [{ p, ownHits }];
  });
  const likeCounts = await getSoloPitchLikeCounts(matches.map(({ p }) => p.id));
  const likesOf = (id: string) => likeCounts.get(id) ?? 0;
  matches.sort(
    (a, b) => b.ownHits - a.ownHits || likesOf(b.p.id) - likesOf(a.p.id) || b.p.createdAt.getTime() - a.p.createdAt.getTime(),
  );
  return enrichSoloPitches(viewerId, matches.slice(0, limit).map(({ p }) => p));
}

export type FeedPage = { items: FeedItem[]; total: number; followsAnyone?: boolean };

export type TrendingSoloPitch = { soloPitchId: string; brandName: string; brandSlug: string; videoUrl: string; likeCount: number };

/**
 * Phase 28: the "Suche" tab's Explore-style strip (Instagram convention —
 * trending content alongside the search itself). Anonymous scoring (no
 * viewer-specific follow/boost bonus) since this isn't the ranked "Für
 * dich"-Feed, just "what's hot right now" for anyone browsing.
 */
export async function getTrendingSoloPitches(limit = 12, viewerId: string | null = null): Promise<TrendingSoloPitch[]> {
  // viewerId nur, damit blockierte Marken auch hier fehlen (RN-7).
  const pitches = await getEligibleSoloPitches(viewerId);
  const ids = pitches.map((p) => p.id);
  const [likeCounts, commentCounts, reactionCounts] = await Promise.all([
    getSoloPitchLikeCounts(ids),
    getCommentCountsForSoloPitches(ids),
    getReactionCounts(ids),
  ]);
  const scored = pitches.map((pitch) => {
    const ageHours = Math.max(0, (Date.now() - pitch.createdAt.getTime()) / (60 * 60 * 1000));
    const engagement =
      (likeCounts.get(pitch.id) ?? 0) + (commentCounts.get(pitch.id) ?? 0) * 1.5 + (reactionCounts.get(pitch.id) ?? 0) * 2;
    return { pitch, score: scoreFromEngagement(engagement, ageHours) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ pitch }) => ({
    soloPitchId: pitch.id,
    brandName: pitch.brand.name,
    brandSlug: pitch.brand.slug,
    videoUrl: pitch.videoUrl,
    likeCount: likeCounts.get(pitch.id) ?? 0,
  }));
}

// Phase 21: a blended single trending score (see git history) quietly
// buried solo pitches — a Duell's vote count (weighted ×2, and
// accumulating over its whole week-long voting window) almost always
// outscores even a brand-new solo pitch, so "the feed IS the newest
// videos" stopped being true for solo content, contradicting the whole
// point of Solo-Pitch (§6 of CLAUDE-CODE-UEBERGABE.md: TikTok/Reels-style,
// newest posts first). Duels keep competing among themselves by trending
// score (that mechanic is fine on its own), but solo pitches are sorted
// purely by recency and then interleaved at a fixed cadence instead of
// competing on the same score — guarantees a fresh solo pitch actually
// surfaces instead of losing to an old, vote-heavy Duell.
const SOLO_INTERLEAVE_EVERY = 3;

/** Stufe-1-Eintrag im Solo-Strom: ein Solo-Pitch oder (Phase E) eine Community-Reaktion. */
type StreamEntry =
  | { kind: "solo"; pitch: SoloPitchWithBrand; createdAt: Date; boosted: boolean }
  | { kind: "reaction"; row: CommunityReactionRow; createdAt: Date };
type PlanEntry = { kind: "duel"; battle: BattleWithBrands } | StreamEntry;

function interleaveFeed(rankedDuels: BattleWithBrands[], streamEntries: StreamEntry[], followedSet: Set<string>): PlanEntry[] {
  // Same "nudge, not override" idea as Duelle: a paid Boost (Phase 26) ranks
  // ahead of a followed brand's pitch, which ranks ahead of everything else
  // — but recency inside each bucket is untouched, so the Phase 21 "newest
  // first" guarantee for solo pitches still holds within any one bucket.
  // Phase E: Community-Reaktionen laufen im selben Strom wie Solo-Pitches mit (nach Aktualität).
  const soloBucket = (e: StreamEntry) =>
    e.kind === "reaction" ? 2 : e.boosted ? 0 : followedSet.has(e.pitch.brandId) ? 1 : 2;
  const freshSolos = [...streamEntries].sort((a, b) => {
    const bucketDiff = soloBucket(a) - soloBucket(b);
    if (bucketDiff !== 0) return bucketDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const merged: PlanEntry[] = [];
  let duelIdx = 0;
  let soloIdx = 0;
  while (duelIdx < rankedDuels.length || soloIdx < freshSolos.length) {
    const nextIsSoloSlot = (merged.length + 1) % SOLO_INTERLEAVE_EVERY === 0;
    if (nextIsSoloSlot && soloIdx < freshSolos.length) {
      merged.push(freshSolos[soloIdx++]);
    } else if (duelIdx < rankedDuels.length) {
      merged.push({ kind: "duel", battle: rankedDuels[duelIdx++] });
    } else {
      merged.push(freshSolos[soloIdx++]);
    }
  }
  return merged;
}

/** Stufe 2 für eine Feed-Seite: nur diese Einträge voll anreichern, Reihenfolge bleibt. */
async function materializePage(viewerId: string | null, plan: PlanEntry[]): Promise<FeedItemWithReactions[]> {
  const [duels, solos, communityReactions] = await Promise.all([
    enrichDuels(viewerId, plan.flatMap((e) => (e.kind === "duel" ? [e.battle] : []))),
    enrichSoloPitches(viewerId, plan.flatMap((e) => (e.kind === "solo" ? [e.pitch] : []))),
    enrichCommunityReactions(viewerId, plan.flatMap((e) => (e.kind === "reaction" ? [e.row] : []))),
  ]);
  const duelById = new Map(duels.map((d) => [d.battleId, d]));
  const soloById = new Map(solos.map((p) => [p.soloPitchId, p]));
  const reactionById = new Map(communityReactions.map((r) => [r.reactionId, r]));
  return plan.flatMap((e): FeedItemWithReactions[] => {
    const item =
      e.kind === "duel"
        ? duelById.get(e.battle.id)
        : e.kind === "solo"
          ? soloById.get(e.pitch.id)
          : reactionById.get(e.row.reaction.id);
    return item ? [item] : [];
  });
}

async function forYouPlan(viewerId: string | null, withReactions: boolean): Promise<PlanEntry[]> {
  const [battles, pitches, followedBrandIds, communityRows] = await Promise.all([
    getEligibleBattles(viewerId),
    getEligibleSoloPitches(viewerId),
    viewerId ? getFollowedBrandIds(viewerId) : Promise.resolve([]),
    withReactions ? getEligibleCommunityReactions(viewerId) : Promise.resolve([]),
  ]);
  const followedSet = new Set(followedBrandIds);
  const [rankedDuels, boostedIds] = await Promise.all([
    rankBattles(battles, followedSet),
    getActiveBoostedSoloPitchIds(pitches.map((p) => p.id)),
  ]);
  const stream: StreamEntry[] = [
    ...pitches.map((pitch): StreamEntry => ({ kind: "solo", pitch, createdAt: pitch.createdAt, boosted: boostedIds.has(pitch.id) })),
    ...communityRows.map((row): StreamEntry => ({ kind: "reaction", row, createdAt: row.reaction.createdAt })),
  ];
  return interleaveFeed(rankedDuels, stream, followedSet);
}

/** "Feed" — every live/finished Duell plus every solo pitch; solo pitches are interleaved by recency, see interleaveFeed. */
export async function getForYouFeed(viewerId: string | null, offset = 0, limit = 6): Promise<FeedPage> {
  const plan = await forYouPlan(viewerId, false);
  const items = (await materializePage(viewerId, plan.slice(offset, offset + limit))) as FeedItem[];
  return { items, total: plan.length };
}

/** Phase E: wie getForYouFeed, zusätzlich mit Community-Reaktionen (nur für die neue App). */
export async function getForYouFeedWithReactions(
  viewerId: string | null,
  offset = 0,
  limit = 6,
): Promise<{ items: FeedItemWithReactions[]; total: number }> {
  const plan = await forYouPlan(viewerId, true);
  return { items: await materializePage(viewerId, plan.slice(offset, offset + limit)), total: plan.length };
}

/**
 * One specific Duell by battleId, for deep-linking into the Feed (e.g. from
 * a notification, or a reminder that just went live) — reuses the same
 * eligibility rule as the rest of the feed, so it returns null for anything
 * not actually live/finished-and-voted yet.
 */
export async function getFeedDuelById(viewerId: string | null, battleId: string): Promise<FeedDuel | null> {
  if (!isUuid(battleId)) return null;
  const [duel] = await buildFeedDuels(viewerId, eq(battlesTable.id, battleId));
  return duel ?? null;
}

/** Same deep-link purpose as getFeedDuelById, for a solo pitch's share link. */
export async function getFeedSoloPitchById(viewerId: string | null, soloPitchId: string): Promise<FeedSoloPitch | null> {
  if (!isUuid(soloPitchId)) return null;
  const [pitch] = await buildFeedSoloPitches(viewerId, eq(soloPitches.id, soloPitchId));
  return pitch ?? null;
}

/**
 * Phase 32: a brand's own profile grid (own /profile or someone else's
 * /brands/[slug]) needs the same viewer-relative shape as the main feed —
 * like/comment/reaction counts, boost state, ownership — not just the raw
 * DB row, because opening a tile reuses FeedSoloPitchCard itself (Luca:
 * "muss genau gleich aussehen wie im Feed").
 */
export async function getFeedSoloPitchesForBrand(viewerId: string | null, brandId: string): Promise<FeedSoloPitch[]> {
  return buildFeedSoloPitches(viewerId, eq(soloPitches.brandId, brandId));
}

/**
 * Phase 40: same purpose as getFeedSoloPitchesForBrand, for the profile
 * grid's "Duelle" tab — Luca: clicking a duel tile there landed in the
 * global feed instead of staying on this profile; needs the full
 * viewer-relative FeedDuel shape (likes/comments/vote state), not just the
 * thumbnail-only ProfileDuelTile, because it reuses FeedDuelCard itself.
 */
export async function getFeedDuelsForBrand(viewerId: string | null, brandId: string): Promise<FeedDuel[]> {
  return buildFeedDuels(viewerId, or(eq(battlesTable.brandAId, brandId), eq(battlesTable.brandBId, brandId)));
}

/** "Folge ich" — Duelle with a followed brand on either side, plus solo pitches from a followed brand, newest first. */
export async function getFollowingFeed(viewerId: string, offset = 0, limit = 6): Promise<FeedPage> {
  const followedBrandIds = await getFollowedBrandIds(viewerId);
  if (followedBrandIds.length === 0) return { items: [], total: 0, followsAnyone: false };

  const [battles, pitches] = await Promise.all([
    getEligibleBattles(
      viewerId,
      or(inArray(battlesTable.brandAId, followedBrandIds), inArray(battlesTable.brandBId, followedBrandIds)),
    ),
    getEligibleSoloPitches(viewerId, inArray(soloPitches.brandId, followedBrandIds)),
  ]);
  const plan: PlanEntry[] = [
    ...battles.map((battle): PlanEntry => ({ kind: "duel", battle })),
    ...pitches.map((pitch): PlanEntry => ({ kind: "solo", pitch, createdAt: pitch.createdAt, boosted: false })),
  ];
  const recencyOf = (e: PlanEntry) => (e.kind === "duel" ? activatedAtOf(e.battle) : e.createdAt).getTime();
  plan.sort((a, b) => recencyOf(b) - recencyOf(a));
  // Phase 43: an empty list here used to always read as "you don't follow
  // anyone" (Luca: "im Feed oben auf Folge ich klicke, ist es leer obwohl
  // ich wem folge") — but it's equally reached when every brand you follow
  // just hasn't posted anything yet, which is a completely different,
  // non-broken situation that deserves a different message.
  const items = (await materializePage(viewerId, plan.slice(offset, offset + limit))) as FeedItem[];
  return { items, total: plan.length, followsAnyone: true };
}
