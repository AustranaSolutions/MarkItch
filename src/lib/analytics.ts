import "server-only";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { brandAnalyticsEvents, visitorEvents, battles, comments, likes, reactions, soloPitches, votes } from "@/db/schema";
import { getFollowerCount } from "@/lib/follow";
import { getBattlesForBrand } from "@/lib/battle";
import { getSoloPitchesForBrand } from "@/lib/solo-pitch";

// Phase 47: 'cta_click' (Klick auf den Kauf-/Standort-Link eines Videos),
// 'vote_click' (eingeloggter Nutzer klickt eine Duell-Seite an, unabhängig
// vom Ausgang) und 'login_required' (nicht eingeloggter Nutzer trifft beim
// Versuch zu voten auf die Login-Wand) ergänzen das bestehende 'view'/'share'
// — für den Vote-Funnel aus dem BETA-Plan (§3.G). Der eigentliche
// abgeschlossene Vote braucht kein eigenes Event, die `votes`-Tabelle ist
// dafür schon die Ground Truth.
export type AnalyticsEventKind = "view" | "share" | "cta_click" | "vote_click" | "login_required";

export type VisitorEventKind = "session_start" | "register_started";

/** Fire-and-forget event log — see schema.ts for why this is a log, not a counter. */
export async function recordAnalyticsEvent(
  brandId: string,
  kind: AnalyticsEventKind,
  target?: { soloPitchId?: string; battleId?: string; anonId?: string },
): Promise<void> {
  await db
    .insert(brandAnalyticsEvents)
    .values({ brandId, kind, soloPitchId: target?.soloPitchId, battleId: target?.battleId, anonId: target?.anonId });
}

export type AnalyticsEventInput = {
  brandId: string;
  kind: AnalyticsEventKind;
  soloPitchId?: string;
  battleId?: string;
  anonId?: string;
};

/**
 * Phase 48: ein einziges Insert für mehrere Events statt einem Roundtrip pro
 * Event — der Client (analytics-client.ts) sammelt View/Klick-Events kurz und
 * schickt sie gebündelt. Schont die kleine Supabase-Instanz beim Durchscrollen
 * eines Feeds, wo sonst mehrere Views pro Sekunde je ein eigenes INSERT
 * auslösen würden.
 */
export async function recordAnalyticsEvents(events: AnalyticsEventInput[]): Promise<void> {
  if (events.length === 0) return;
  await db.insert(brandAnalyticsEvents).values(
    events.map((e) => ({ brandId: e.brandId, kind: e.kind, soloPitchId: e.soloPitchId, battleId: e.battleId, anonId: e.anonId })),
  );
}

/** Fire-and-forget — see visitorEvents in schema.ts for why this isn't just another brandAnalyticsEvents row. */
export async function recordVisitorEvent(
  anonId: string,
  kind: VisitorEventKind,
  extra?: { userId?: string | null; ref?: string | null },
): Promise<void> {
  await db.insert(visitorEvents).values({ anonId, kind, userId: extra?.userId ?? null, ref: extra?.ref ?? null });
}

async function getEventCount(brandId: string, kind: AnalyticsEventKind): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(brandAnalyticsEvents)
    .where(and(eq(brandAnalyticsEvents.brandId, brandId), eq(brandAnalyticsEvents.kind, kind)));
  return row?.n ?? 0;
}

/** Phase 41: per-video view counts (Luca: TikTok/Insta always show this) — batched for a whole feed page. */
export async function getViewCountsForSoloPitches(soloPitchIds: string[]): Promise<Map<string, number>> {
  if (soloPitchIds.length === 0) return new Map();
  const rows = await db
    .select({ soloPitchId: brandAnalyticsEvents.soloPitchId, n: count() })
    .from(brandAnalyticsEvents)
    .where(and(eq(brandAnalyticsEvents.kind, "view"), inArray(brandAnalyticsEvents.soloPitchId, soloPitchIds)))
    .groupBy(brandAnalyticsEvents.soloPitchId);
  return new Map(rows.map((r) => [r.soloPitchId as string, r.n]));
}

/** Same as getViewCountsForSoloPitches, keyed on a battle instead (both sides combined). */
export async function getViewCountsForBattles(battleIds: string[]): Promise<Map<string, number>> {
  if (battleIds.length === 0) return new Map();
  const rows = await db
    .select({ battleId: brandAnalyticsEvents.battleId, n: count() })
    .from(brandAnalyticsEvents)
    .where(and(eq(brandAnalyticsEvents.kind, "view"), inArray(brandAnalyticsEvents.battleId, battleIds)))
    .groupBy(brandAnalyticsEvents.battleId);
  return new Map(rows.map((r) => [r.battleId as string, r.n]));
}

export type BrandAnalyticsSummary = {
  views: number;
  shares: number;
  votesReceived: number;
  likesReceived: number;
  commentsReceived: number;
  reactionsReceived: number;
  followerCount: number;
  /** Phase F: Klicks auf den Link-Knopf (Shop, Rabatt, Route) — wurde schon gezählt, aber nirgends gezeigt. */
  ctaClicks: number;
};

/**
 * Brand-wide totals across every piece of content this brand has ever
 * posted (solo pitches, both sides of every battle, reactions on their own
 * pitches). `likes.brandId` is always populated regardless of what the like
 * actually targets (see schema.ts) — that's what makes a single count()
 * here work for likes across solo pitches, reactions and battle sides at
 * once, instead of three separate queries unioned together.
 */
export async function getBrandAnalyticsSummary(brandId: string): Promise<BrandAnalyticsSummary> {
  const myPitchIdRows = await db.select({ id: soloPitches.id }).from(soloPitches).where(eq(soloPitches.brandId, brandId));
  const myPitchIds = myPitchIdRows.map((r) => r.id);

  const [views, shares, ctaClicks, votesRow, likesRow, battleCommentsRow, soloCommentsRow, reactionsRow, followerCount] =
    await Promise.all([
      getEventCount(brandId, "view"),
      getEventCount(brandId, "share"),
      getEventCount(brandId, "cta_click"),
      db.select({ n: count() }).from(votes).where(eq(votes.votedForBrandId, brandId)),
      db.select({ n: count() }).from(likes).where(eq(likes.brandId, brandId)),
      db
        .select({ n: count() })
        .from(comments)
        .innerJoin(battles, eq(comments.battleId, battles.id))
        .where(or(eq(battles.brandAId, brandId), eq(battles.brandBId, brandId))),
      db
        .select({ n: count() })
        .from(comments)
        .innerJoin(soloPitches, eq(comments.soloPitchId, soloPitches.id))
        .where(eq(soloPitches.brandId, brandId)),
      myPitchIds.length
        ? db.select({ n: count() }).from(reactions).where(inArray(reactions.soloPitchId, myPitchIds))
        : Promise.resolve([{ n: 0 }]),
      getFollowerCount(brandId),
    ]);

  return {
    views,
    shares,
    votesReceived: votesRow[0]?.n ?? 0,
    likesReceived: likesRow[0]?.n ?? 0,
    commentsReceived: (battleCommentsRow[0]?.n ?? 0) + (soloCommentsRow[0]?.n ?? 0),
    reactionsReceived: reactionsRow[0]?.n ?? 0,
    followerCount,
    ctaClicks,
  };
}

export type BrandContentItem = {
  key: string;
  kind: "solo" | "battle";
  /** Phase F: soloPitchId bzw. battleId — die App öffnet damit das Video. */
  id: string;
  label: string; // Beschreibung des Solo-Pitches (gekürzt) bzw. "vs. <opponent>"
  createdAt: string; // ISO
  likeCount: number;
  commentCount: number;
  /** Phase F: Aufrufe und Link-Klicks — bei Duellen nur die eigene Seite. */
  viewCount: number;
  ctaClickCount: number;
  /** Only set for kind "solo" — how many brands reacted. */
  reactionCount?: number;
  /** Only set for kind "battle" — this brand's vote share of the two sides. */
  votesForThisBrand?: number;
  votesTotal?: number;
};

/** Per-item breakdown so a brand can see which of their videos actually performs. */
export async function getBrandContentBreakdown(brandId: string): Promise<BrandContentItem[]> {
  const [soloPitches_, myBattles, eventRows] = await Promise.all([
    getSoloPitchesForBrand(brandId),
    getBattlesForBrand(brandId),
    // Phase F: Aufrufe/Link-Klicks pro Video in einer Abfrage.
    db
      .select({
        soloPitchId: brandAnalyticsEvents.soloPitchId,
        battleId: brandAnalyticsEvents.battleId,
        kind: brandAnalyticsEvents.kind,
        n: count(),
      })
      .from(brandAnalyticsEvents)
      .where(and(eq(brandAnalyticsEvents.brandId, brandId), inArray(brandAnalyticsEvents.kind, ["view", "cta_click"])))
      .groupBy(brandAnalyticsEvents.soloPitchId, brandAnalyticsEvents.battleId, brandAnalyticsEvents.kind),
  ]);
  const eventCount = new Map<string, number>();
  for (const r of eventRows) {
    const target = r.soloPitchId ?? r.battleId;
    if (target) eventCount.set(`${target}:${r.kind}`, (eventCount.get(`${target}:${r.kind}`) ?? 0) + r.n);
  }

  const soloPitchIds = soloPitches_.map((p) => p.id);
  const battleIds = myBattles.map((b) => b.id);

  const [soloLikeCounts, soloCommentCounts, reactionCounts, battleLikeKeys] = await Promise.all([
    soloPitchIds.length
      ? db
          .select({ soloPitchId: likes.soloPitchId, n: count() })
          .from(likes)
          .where(inArray(likes.soloPitchId, soloPitchIds))
          .groupBy(likes.soloPitchId)
      : Promise.resolve([]),
    soloPitchIds.length
      ? db
          .select({ soloPitchId: comments.soloPitchId, n: count() })
          .from(comments)
          .where(inArray(comments.soloPitchId, soloPitchIds))
          .groupBy(comments.soloPitchId)
      : Promise.resolve([]),
    soloPitchIds.length
      ? db
          .select({ soloPitchId: reactions.soloPitchId, n: count() })
          .from(reactions)
          .where(inArray(reactions.soloPitchId, soloPitchIds))
          .groupBy(reactions.soloPitchId)
      : Promise.resolve([]),
    battleIds.length
      ? db
          .select({ battleId: likes.battleId, brandId: likes.brandId, n: count() })
          .from(likes)
          .where(inArray(likes.battleId, battleIds))
          .groupBy(likes.battleId, likes.brandId)
      : Promise.resolve([]),
  ]);

  const soloLikeMap = new Map(soloLikeCounts.map((r) => [r.soloPitchId as string, r.n]));
  const soloCommentMap = new Map(soloCommentCounts.map((r) => [r.soloPitchId as string, r.n]));
  const reactionMap = new Map(reactionCounts.map((r) => [r.soloPitchId as string, r.n]));
  const battleLikeMap = new Map(battleLikeKeys.map((r) => [`${r.battleId}:${r.brandId}`, r.n]));

  const battleCommentCounts = battleIds.length
    ? await db
        .select({ battleId: comments.battleId, n: count() })
        .from(comments)
        .where(inArray(comments.battleId, battleIds))
        .groupBy(comments.battleId)
    : [];
  const battleCommentMap = new Map(battleCommentCounts.map((r) => [r.battleId as string, r.n]));

  const battleVoteCounts = battleIds.length
    ? await db
        .select({ battleId: votes.battleId, votedForBrandId: votes.votedForBrandId, n: count() })
        .from(votes)
        .where(inArray(votes.battleId, battleIds))
        .groupBy(votes.battleId, votes.votedForBrandId)
    : [];
  const votesByBattleBrand = new Map(battleVoteCounts.map((r) => [`${r.battleId}:${r.votedForBrandId}`, r.n]));
  const votesTotalByBattle = new Map<string, number>();
  for (const r of battleVoteCounts) {
    votesTotalByBattle.set(r.battleId, (votesTotalByBattle.get(r.battleId) ?? 0) + r.n);
  }

  const soloItems: BrandContentItem[] = soloPitches_.map((p) => ({
    key: `solo:${p.id}`,
    kind: "solo",
    id: p.id,
    label: p.description ? (p.description.length > 40 ? `${p.description.slice(0, 40).trimEnd()}…` : p.description) : "Solo-Pitch",
    createdAt: p.createdAt.toISOString(),
    viewCount: eventCount.get(`${p.id}:view`) ?? 0,
    ctaClickCount: eventCount.get(`${p.id}:cta_click`) ?? 0,
    likeCount: soloLikeMap.get(p.id) ?? 0,
    commentCount: soloCommentMap.get(p.id) ?? 0,
    reactionCount: reactionMap.get(p.id) ?? 0,
  }));

  const battleItems: BrandContentItem[] = myBattles.map((b) => {
    const opponent = b.brandAId === brandId ? b.brandB : b.brandA;
    return {
      key: `battle:${b.id}`,
      kind: "battle",
      id: b.id,
      label: `vs. ${opponent.name}`,
      createdAt: b.createdAt.toISOString(),
      viewCount: eventCount.get(`${b.id}:view`) ?? 0,
      ctaClickCount: eventCount.get(`${b.id}:cta_click`) ?? 0,
      likeCount: battleLikeMap.get(`${b.id}:${brandId}`) ?? 0,
      commentCount: battleCommentMap.get(b.id) ?? 0,
      votesForThisBrand: votesByBattleBrand.get(`${b.id}:${brandId}`) ?? 0,
      votesTotal: votesTotalByBattle.get(b.id) ?? 0,
    };
  });

  return [...soloItems, ...battleItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
