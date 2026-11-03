import "server-only";
import { and, count, desc, eq, gte, inArray, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { battles, brandAnalyticsEvents, comments, follows, likes, reactions, soloPitches, votes } from "@/db/schema";
import { reportError } from "@/lib/error-alerts";

// Luca 03.11.: MarkItch Score (1,0–10,0) — wie gut kommen die Videos einer Marke
// bei denen an, die sie sehen. Quoten statt absoluter Zahlen, damit auch kleine
// Marken gut abschneiden können. Vorerst nur für die Marke selbst in der eigenen
// Statistik, ohne Aufschlüsselung (die kommt später mit den erweiterten,
// bezahlten Statistiken).
//
// Bausteine (je 0–1), gewichtet:
//   Duell-Stärke 30 % · Link-Klickrate 25 % · Engagement 25 % · neue Follower 10 % · Aktivität 10 %
// Score = 1 + 9 × gewichtete Summe.
//
// Freigeschaltet erst ab 3 Duellen (eigenes Video eingereicht) und 5 Videos
// (Solo-Pitches) — Anreiz, MarkItch wirklich zu nutzen.

export const SCORE_MIN_DUELS = 3;
export const SCORE_MIN_VIDEOS = 5;

const DAY = 24 * 60 * 60 * 1000;
const RATE_WINDOW_DAYS = 90;
const ACTIVITY_WINDOW_DAYS = 30;
/** Glättung: so viele „gedachte“ Aufrufe mit mittleren Werten — wenige Aufrufe ziehen Richtung Mitte. */
const PRIOR_VIEWS = 200;
/** Glättung der Duell-Stimmen: so viele gedachte Stimmen mit 50 %. */
const PRIOR_VOTES = 20;
/** Höchstens so viele der letzten beendeten Duelle zählen. */
const MAX_DUELS = 10;

const FULL_CTA_RATE = 0.05;
const FULL_ENGAGEMENT_RATE = 0.15;
const FULL_FOLLOW_RATE = 0.02;
const FULL_ACTIVITY = 4;

export type MarkItchScore =
  | { unlocked: false; duels: number; videos: number; duelsNeeded: number; videosNeeded: number }
  | { unlocked: true; score: number };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Gelättete Quote → 0–1 (bei „voll“ = 1, ohne Daten = 0,5). */
function rateComponent(hits: number, views: number, full: number): number {
  const rate = (hits + PRIOR_VIEWS * full * 0.5) / (views + PRIOR_VIEWS);
  return clamp01(rate / full);
}

/**
 * Stimmenanteil → 0–1. Bewusst großzügig um die Mitte: ein knapp verlorenes
 * Duell (49 %) ist trotzdem gut (≈ 0,67) und kaum schlechter als ein knapper
 * Sieg (51 % ≈ 0,72). 30 % oder weniger = 0, 70 % oder mehr = 1.
 */
export function duelComponent(share: number): number {
  if (share <= 0.3) return 0;
  if (share <= 0.5) return ((share - 0.3) / 0.2) * 0.7;
  return clamp01(0.7 + ((share - 0.5) / 0.2) * 0.3);
}

/** Für Statistik-Seiten: ein Fehler im Score darf nie die ganze Statistik lahmlegen (wird gemeldet). */
export async function getMarkItchScoreSafe(brandId: string): Promise<MarkItchScore | null> {
  try {
    return await getMarkItchScore(brandId);
  } catch (err) {
    await reportError("server", `MarkItch Score: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : null);
    return null;
  }
}

export async function getMarkItchScore(brandId: string): Promise<MarkItchScore> {
  const now = new Date();
  const rateSince = new Date(now.getTime() - RATE_WINDOW_DAYS * DAY);
  const activitySince = new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * DAY);

  const ownSubmitted = or(
    and(eq(battles.brandAId, brandId), isNotNull(battles.brandASubmittedAt)),
    and(eq(battles.brandBId, brandId), isNotNull(battles.brandBSubmittedAt)),
  );
  const [[duelRow], [videoRow]] = await Promise.all([
    db.select({ n: count() }).from(battles).where(ownSubmitted),
    db.select({ n: count() }).from(soloPitches).where(eq(soloPitches.brandId, brandId)),
  ]);
  const duels = duelRow?.n ?? 0;
  const videos = videoRow?.n ?? 0;
  if (duels < SCORE_MIN_DUELS || videos < SCORE_MIN_VIDEOS) {
    return { unlocked: false, duels, videos, duelsNeeded: SCORE_MIN_DUELS, videosNeeded: SCORE_MIN_VIDEOS };
  }

  const eventCount = (kind: string) =>
    db
      .select({ n: count() })
      .from(brandAnalyticsEvents)
      .where(and(eq(brandAnalyticsEvents.brandId, brandId), eq(brandAnalyticsEvents.kind, kind), gte(brandAnalyticsEvents.createdAt, rateSince)));

  const myPitchIds = (await db.select({ id: soloPitches.id }).from(soloPitches).where(eq(soloPitches.brandId, brandId))).map((r) => r.id);

  const [
    [views],
    [ctaClicks],
    [shares],
    [likeRow],
    [battleComments],
    [soloComments],
    [reactionRow],
    [followRow],
    [recentPitches],
    [recentDuels],
    finishedDuels,
  ] = await Promise.all([
    eventCount("view"),
    eventCount("cta_click"),
    eventCount("share"),
    db.select({ n: count() }).from(likes).where(and(eq(likes.brandId, brandId), gte(likes.createdAt, rateSince))),
    db
      .select({ n: count() })
      .from(comments)
      .innerJoin(battles, eq(comments.battleId, battles.id))
      .where(and(or(eq(battles.brandAId, brandId), eq(battles.brandBId, brandId)), gte(comments.createdAt, rateSince))),
    db
      .select({ n: count() })
      .from(comments)
      .innerJoin(soloPitches, eq(comments.soloPitchId, soloPitches.id))
      .where(and(eq(soloPitches.brandId, brandId), gte(comments.createdAt, rateSince))),
    myPitchIds.length
      ? db
          .select({ n: count() })
          .from(reactions)
          .where(and(inArray(reactions.soloPitchId, myPitchIds), gte(reactions.createdAt, rateSince)))
      : Promise.resolve([{ n: 0 }]),
    db.select({ n: count() }).from(follows).where(and(eq(follows.brandId, brandId), gte(follows.createdAt, rateSince))),
    db.select({ n: count() }).from(soloPitches).where(and(eq(soloPitches.brandId, brandId), gte(soloPitches.createdAt, activitySince))),
    db
      .select({ n: count() })
      .from(battles)
      .where(
        or(
          and(eq(battles.brandAId, brandId), gte(battles.brandASubmittedAt, activitySince)),
          and(eq(battles.brandBId, brandId), gte(battles.brandBSubmittedAt, activitySince)),
        ),
      ),
    db
      .select({ id: battles.id, brandAId: battles.brandAId, votingEndsAt: battles.votingEndsAt })
      .from(battles)
      .where(and(or(eq(battles.brandAId, brandId), eq(battles.brandBId, brandId)), isNotNull(battles.votingEndsAt), lt(battles.votingEndsAt, now)))
      .orderBy(desc(battles.votingEndsAt))
      .limit(MAX_DUELS),
  ]);

  // Duell-Stärke: offizielle Stimmen (bis Abstimmungsende) aller beendeten Duelle zusammen.
  let votesFor = 0;
  let votesTotal = 0;
  if (finishedDuels.length) {
    const rows = await db
      .select({
        battleId: votes.battleId,
        own: sql<number>`count(*) filter (where ${votes.votedForBrandId} = ${brandId})`.mapWith(Number),
        total: count(),
      })
      .from(votes)
      .innerJoin(battles, eq(votes.battleId, battles.id))
      .where(and(inArray(votes.battleId, finishedDuels.map((d) => d.id)), lte(votes.createdAt, battles.votingEndsAt)))
      .groupBy(votes.battleId);
    for (const r of rows) {
      votesFor += r.own;
      votesTotal += r.total;
    }
  }
  const duelShare = (votesFor + PRIOR_VOTES * 0.5) / (votesTotal + PRIOR_VOTES);

  const viewCount = views?.n ?? 0;
  const engagementHits =
    (likeRow?.n ?? 0) +
    3 * ((battleComments?.n ?? 0) + (soloComments?.n ?? 0)) +
    5 * (shares?.n ?? 0) +
    5 * (reactionRow?.n ?? 0);
  const activity = (recentPitches?.n ?? 0) + (recentDuels?.n ?? 0);

  const weighted =
    0.3 * duelComponent(duelShare) +
    0.25 * rateComponent(ctaClicks?.n ?? 0, viewCount, FULL_CTA_RATE) +
    0.25 * rateComponent(engagementHits, viewCount, FULL_ENGAGEMENT_RATE) +
    0.1 * rateComponent(followRow?.n ?? 0, viewCount, FULL_FOLLOW_RATE) +
    0.1 * clamp01(activity / FULL_ACTIVITY);

  return { unlocked: true, score: Math.round((1 + 9 * weighted) * 10) / 10 };
}
