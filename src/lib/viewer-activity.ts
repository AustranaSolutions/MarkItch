import "server-only";
import { and, count, desc, eq, gt, inArray, isNotNull, lt, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import { battles, brands, comments, follows, likes, reactions, soloPitches, votes } from "@/db/schema";

// Luca 11.10.: Zuschauer-Profil. Belohnt wird das Mitmachen, nie die
// Richtung der Stimme — kein Tippspiel, sonst stimmen Leute für das, was
// vermutlich gewinnt, statt für das, was ihnen gefällt (und genau diese
// ehrliche Meinung ist der Wert von MarkItch für Marken).

/** Ab so vielen beendeten Duellen zeigen wir ein Geschmacks-Profil. */
const TASTE_MIN_DUELS = 3;

export type ViewerActivity = {
  votesCast: number;
  likesGiven: number;
  commentsWritten: number;
  followingCount: number;
  /** Tage in Folge mit mindestens einer Stimme, einem Like, Kommentar oder einer Reaktion (Zeitzone Wien). */
  streakDays: number;
  /** null, solange zu wenige beendete Duelle — sonst wie oft man wie die Mehrheit gestimmt hat. */
  taste: { withMajority: number; decided: number } | null;
  reactions: {
    id: string;
    soloPitchId: string;
    videoUrl: string;
    likeCount: number;
    originalBrandName: string;
    createdAt: string;
  }[];
};

/** Kalendertag in Wien als YYYY-MM-DD. */
function viennaDay(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
}

function currentStreak(days: Set<string>): number {
  const day = new Date();
  // Heute noch nichts gemacht? Dann zählt die Serie bis gestern weiter.
  if (!days.has(viennaDay(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (days.has(viennaDay(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export async function getViewerActivity(userId: string): Promise<ViewerActivity> {
  const since = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
  const dayOf = (col: AnyColumn) => sql<string>`to_char(${col} at time zone 'Europe/Vienna', 'YYYY-MM-DD')`;

  const [voteCount, likeCount, commentCount, followCount, activeDays, myFinishedVotes, myReactions] = await Promise.all([
    db.select({ n: count() }).from(votes).where(eq(votes.userId, userId)),
    db.select({ n: count() }).from(likes).where(eq(likes.userId, userId)),
    db.select({ n: count() }).from(comments).where(eq(comments.userId, userId)),
    db.select({ n: count() }).from(follows).where(eq(follows.userId, userId)),
    Promise.all([
      db.selectDistinct({ d: dayOf(votes.createdAt) }).from(votes).where(and(eq(votes.userId, userId), gt(votes.createdAt, since))),
      db.selectDistinct({ d: dayOf(likes.createdAt) }).from(likes).where(and(eq(likes.userId, userId), gt(likes.createdAt, since))),
      db.selectDistinct({ d: dayOf(comments.createdAt) }).from(comments).where(and(eq(comments.userId, userId), gt(comments.createdAt, since))),
      db.selectDistinct({ d: dayOf(reactions.createdAt) }).from(reactions).where(and(eq(reactions.userId, userId), gt(reactions.createdAt, since))),
    ]),
    // Eigene Stimmen in Duellen, deren Abstimmung vorbei ist.
    db
      .select({ battleId: votes.battleId, votedForBrandId: votes.votedForBrandId, endsAt: battles.votingEndsAt })
      .from(votes)
      .innerJoin(battles, eq(votes.battleId, battles.id))
      .where(and(eq(votes.userId, userId), isNotNull(battles.votingEndsAt), lt(battles.votingEndsAt, new Date()))),
    db
      .select({
        id: reactions.id,
        soloPitchId: reactions.soloPitchId,
        videoUrl: reactions.videoUrl,
        createdAt: reactions.createdAt,
        originalBrandName: brands.name,
      })
      .from(reactions)
      .innerJoin(soloPitches, eq(reactions.soloPitchId, soloPitches.id))
      .innerJoin(brands, eq(soloPitches.brandId, brands.id))
      .where(eq(reactions.userId, userId))
      .orderBy(desc(reactions.createdAt)),
  ]);

  const days = new Set(activeDays.flat().map((r) => r.d));

  // Offizielles Ergebnis (Stimmen bis Fristende) der Duelle, an denen man teilgenommen hat — eine Abfrage.
  let taste: ViewerActivity["taste"] = null;
  if (myFinishedVotes.length >= TASTE_MIN_DUELS) {
    const battleIds = myFinishedVotes.map((v) => v.battleId);
    const tallies = await db
      .select({ battleId: votes.battleId, brandId: votes.votedForBrandId, n: count() })
      .from(votes)
      .innerJoin(battles, eq(votes.battleId, battles.id))
      .where(and(inArray(votes.battleId, battleIds), sql`${votes.createdAt} <= ${battles.votingEndsAt}`))
      .groupBy(votes.battleId, votes.votedForBrandId);
    const byBattle = new Map<string, Map<string, number>>();
    for (const t of tallies) {
      if (!byBattle.has(t.battleId)) byBattle.set(t.battleId, new Map());
      byBattle.get(t.battleId)!.set(t.brandId, t.n);
    }
    let decided = 0;
    let withMajority = 0;
    for (const v of myFinishedVotes) {
      const counts = [...(byBattle.get(v.battleId)?.entries() ?? [])].sort((a, b) => b[1] - a[1]);
      if (counts.length === 0 || (counts.length > 1 && counts[0][1] === counts[1][1])) continue; // unentschieden
      decided++;
      if (counts[0][0] === v.votedForBrandId) withMajority++;
    }
    if (decided >= TASTE_MIN_DUELS) taste = { withMajority, decided };
  }

  const reactionIds = myReactions.map((r) => r.id);
  const reactionLikes = reactionIds.length
    ? await db
        .select({ reactionId: likes.reactionId, n: count() })
        .from(likes)
        .where(inArray(likes.reactionId, reactionIds))
        .groupBy(likes.reactionId)
    : [];
  const likesByReaction = new Map(reactionLikes.map((r) => [r.reactionId, r.n]));

  return {
    votesCast: voteCount[0]?.n ?? 0,
    likesGiven: likeCount[0]?.n ?? 0,
    commentsWritten: commentCount[0]?.n ?? 0,
    followingCount: followCount[0]?.n ?? 0,
    streakDays: currentStreak(days),
    taste,
    reactions: myReactions.map((r) => ({
      id: r.id,
      soloPitchId: r.soloPitchId,
      videoUrl: r.videoUrl,
      likeCount: likesByReaction.get(r.id) ?? 0,
      originalBrandName: r.originalBrandName,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
