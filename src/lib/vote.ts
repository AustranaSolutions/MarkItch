import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, inArray, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { battles, brandMembers, guestVotes, votes } from "@/db/schema";

export type VoteTally = { brandAVotes: number; brandBVotes: number; total: number };

/**
 * Blind-Abstimmen auch serverseitig: vor Fristende verlässt nur die
 * Gesamtzahl den Server, nie die Aufteilung — sonst könnte jeder, der die
 * API-Antwort mitliest (oder die App-Version, die sie zufällig anzeigt), den
 * Zwischenstand sehen und der Mitläufer-Effekt wäre wieder da. Die Oberfläche
 * zeigt vor Fristende ohnehin nur `total` (siehe VoteState in
 * feed-duel-card.tsx), serverinterne Rechnungen (Trending, Gewinner) nutzen
 * weiter die echte Zählung.
 */
export function publicTally(tally: VoteTally, isFinished: boolean): VoteTally {
  return isFinished ? tally : { brandAVotes: 0, brandBVotes: 0, total: tally.total };
}

/**
 * Luca 13.11. (Phase 5): Gast-Stimmen (ohne Konto) zählen halb — pro Seite
 * angemeldete + ⌊Gäste/2⌋, damit Gäste nicht mehr Gewicht haben als Konten.
 */
function combineTally(
  registered: { votedForBrandId: string; n: number }[],
  guests: { votedForBrandId: string; n: number }[],
  brandAId: string,
  brandBId: string,
): VoteTally {
  const reg = new Map(registered.map((r) => [r.votedForBrandId, r.n]));
  const gst = new Map(guests.map((r) => [r.votedForBrandId, r.n]));
  const side = (id: string) => (reg.get(id) ?? 0) + Math.floor((gst.get(id) ?? 0) / 2);
  const brandAVotes = side(brandAId);
  const brandBVotes = side(brandBId);
  return { brandAVotes, brandBVotes, total: brandAVotes + brandBVotes };
}

export async function getVoteTally(battleId: string, brandAId: string, brandBId: string): Promise<VoteTally> {
  const [rows, guests] = await Promise.all([
    db
      .select({ votedForBrandId: votes.votedForBrandId, n: count() })
      .from(votes)
      .where(eq(votes.battleId, battleId))
      .groupBy(votes.votedForBrandId),
    db
      .select({ votedForBrandId: guestVotes.votedForBrandId, n: count() })
      .from(guestVotes)
      .where(eq(guestVotes.battleId, battleId))
      .groupBy(guestVotes.votedForBrandId),
  ]);
  return combineTally(rows, guests, brandAId, brandBId);
}

/**
 * Phase 12: the tally as it stood at a fixed point in time — used to freeze
 * a battle's "official" result at votingEndsAt even though voting itself
 * never actually stops (see castVoteForUser: there's no deadline check).
 * That's deliberate — the master prompt's own idea of a real underdog story
 * playing out over time only works if people can keep voting after the
 * announced result, and the feed shows both: the frozen official result
 * (this function) and the live, still-growing tally (getVoteTally above).
 */
export async function getVoteTallyAsOf(
  battleId: string,
  brandAId: string,
  brandBId: string,
  asOf: Date,
): Promise<VoteTally> {
  const [rows, guests] = await Promise.all([
    db
      .select({ votedForBrandId: votes.votedForBrandId, n: count() })
      .from(votes)
      .where(and(eq(votes.battleId, battleId), lte(votes.createdAt, asOf)))
      .groupBy(votes.votedForBrandId),
    db
      .select({ votedForBrandId: guestVotes.votedForBrandId, n: count() })
      .from(guestVotes)
      .where(and(eq(guestVotes.battleId, battleId), lte(guestVotes.createdAt, asOf)))
      .groupBy(guestVotes.votedForBrandId),
  ]);
  return combineTally(rows, guests, brandAId, brandBId);
}

/** Which brand (if any) this user already voted for in this battle. */
export async function getUserVote(battleId: string, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ votedForBrandId: votes.votedForBrandId })
    .from(votes)
    .where(and(eq(votes.battleId, battleId), eq(votes.userId, userId)))
    .limit(1);
  return row?.votedForBrandId ?? null;
}

/** Total vote count per battle, for list views (e.g. /pitches cards). */
export async function getVoteTotals(battleIds: string[]): Promise<Map<string, number>> {
  if (battleIds.length === 0) return new Map();
  const rows = await db
    .select({ battleId: votes.battleId, n: count() })
    .from(votes)
    .where(inArray(votes.battleId, battleIds))
    .groupBy(votes.battleId);
  return new Map(rows.map((r) => [r.battleId, r.n]));
}

/**
 * The actual vote-casting logic, shared by the /pitches/[id] page's form
 * action (src/app/actions/vote.ts) and the feed's vote API route
 * (src/app/api/feed/vote/route.ts) — same rules either way: a brand's own
 * team can't vote in its own Pitch, and one vote per battle per user (the
 * unique index on (battleId, userId) is the real backstop, this check is
 * just for a friendly error message).
 *
 * Deliberately no "voting is closed" check: a Pitch's official result
 * freezes at votingEndsAt (see getVoteTallyAsOf), but anyone who hasn't
 * voted yet can still vote afterwards — the live tally keeps growing, shown
 * in the feed alongside the frozen result. Whether the two ever diverge
 * enough to flip who "would" be winning is exactly the kind of thing worth
 * watching play out, not something to shut off at the deadline.
 */
export async function castVoteForUser(
  userId: string,
  battleId: string,
  votedForBrandId: string,
): Promise<{ error?: string }> {
  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId)).limit(1);
  if (!battle) {
    return { error: "Dieser Pitch existiert nicht." };
  }
  if (votedForBrandId !== battle.brandAId && votedForBrandId !== battle.brandBId) {
    return { error: "Ungültige Marke für diesen Pitch." };
  }

  // Audit 04.10. (H1): Abstimmen erst, wenn beide Videos da sind — sonst
  // ließen sich per direktem API-Aufruf schon vor dem Start Stimmen sammeln.
  // Altbestand ohne Produktionsfrist nutzt die Profilvideos (resolveBattleVideos).
  const isLegacyRow = battle.mode === "scheduled" && battle.productionDeadline === null;
  if (!isLegacyRow && (!battle.brandAVideoUrl || !battle.brandBVideoUrl)) {
    return { error: "Abstimmen ist erst möglich, wenn beide Videos da sind." };
  }

  const [ownMembership] = await db
    .select({ brandId: brandMembers.brandId })
    .from(brandMembers)
    .where(
      and(
        eq(brandMembers.userId, userId),
        or(eq(brandMembers.brandId, battle.brandAId), eq(brandMembers.brandId, battle.brandBId)),
      ),
    )
    .limit(1);
  if (ownMembership) {
    return { error: "Du kannst nicht bei einem Pitch deiner eigenen Marke abstimmen." };
  }

  const existingVote = await getUserVote(battleId, userId);
  if (existingVote) {
    return { error: "Du hast bereits abgestimmt." };
  }

  await db.insert(votes).values({ battleId, userId, votedForBrandId }).onConflictDoNothing();
  return {};
}

// ——— Luca 13.11. (Phase 5): Abstimmen ohne Konto ———

const GUEST_ID_RE = /^[A-Za-z0-9-]{16,64}$/;

/** Nur der Hash der zufälligen Geräte-Kennung wird gespeichert. */
function hashGuestId(guestId: string): string {
  return createHash("sha256").update(`markitch-guest:${guestId}`).digest("hex");
}

/** Gleiche Regeln wie castVoteForUser, nur pro Gerät statt pro Konto. */
export async function castGuestVote(guestId: unknown, battleId: string, votedForBrandId: string): Promise<{ error?: string }> {
  if (typeof guestId !== "string" || !GUEST_ID_RE.test(guestId)) return { error: "Bitte melde dich an." };
  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId)).limit(1);
  if (!battle) return { error: "Dieser Pitch existiert nicht." };
  if (votedForBrandId !== battle.brandAId && votedForBrandId !== battle.brandBId) {
    return { error: "Ungültige Marke für diesen Pitch." };
  }
  const isLegacyRow = battle.mode === "scheduled" && battle.productionDeadline === null;
  if (!isLegacyRow && (!battle.brandAVideoUrl || !battle.brandBVideoUrl)) {
    return { error: "Abstimmen ist erst möglich, wenn beide Videos da sind." };
  }
  const inserted = await db
    .insert(guestVotes)
    .values({ battleId, deviceHash: hashGuestId(guestId), votedForBrandId })
    .onConflictDoNothing()
    .returning({ id: guestVotes.id });
  if (inserted.length === 0) return { error: "Du hast bereits abgestimmt." };
  return {};
}

/** Für welche Seite dieses Gerät schon gestimmt hat (je Duell). */
export async function getGuestVotes(guestId: unknown, battleIds: string[]): Promise<Map<string, string>> {
  if (typeof guestId !== "string" || !GUEST_ID_RE.test(guestId) || battleIds.length === 0) return new Map();
  const rows = await db
    .select({ battleId: guestVotes.battleId, votedForBrandId: guestVotes.votedForBrandId })
    .from(guestVotes)
    .where(and(eq(guestVotes.deviceHash, hashGuestId(guestId)), inArray(guestVotes.battleId, battleIds)));
  return new Map(rows.map((r) => [r.battleId, r.votedForBrandId]));
}
