import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { likes } from "@/db/schema";

export type LikeKey = { battleId: string; brandId: string };

function keyOf(battleId: string, brandId: string): string {
  return `${battleId}:${brandId}`;
}

/** Like counts for a batch of (battleId, brandId) cards — one query for a whole feed page. */
export async function getLikeCounts(keys: LikeKey[]): Promise<Map<string, number>> {
  if (keys.length === 0) return new Map();
  const battleIds = [...new Set(keys.map((k) => k.battleId))];
  const rows = await db
    .select({ battleId: likes.battleId, brandId: likes.brandId, n: count() })
    .from(likes)
    .where(inArray(likes.battleId, battleIds))
    .groupBy(likes.battleId, likes.brandId);
  const map = new Map<string, number>();
  // battleId is nullable at the schema level (Phase 13: solo-pitch/reaction
  // likes share this table) but never null here — the WHERE clause only
  // ever matches battle-side rows, and battle likes always carry the side's brand.
  for (const row of rows) map.set(keyOf(row.battleId!, row.brandId!), row.n);
  return map;
}

/** Which of these cards this user has already liked. */
export async function getUserLikedKeys(userId: string, keys: LikeKey[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const battleIds = [...new Set(keys.map((k) => k.battleId))];
  const rows = await db
    .select({ battleId: likes.battleId, brandId: likes.brandId })
    .from(likes)
    .where(and(eq(likes.userId, userId), inArray(likes.battleId, battleIds)));
  return new Set(rows.map((row) => keyOf(row.battleId!, row.brandId!)));
}

export async function getLikeCount(battleId: string, brandId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(likes)
    .where(and(eq(likes.battleId, battleId), eq(likes.brandId, brandId)));
  return row?.n ?? 0;
}

/** Toggle a like on/off for this user on this card. */
export async function toggleLikeForUser(
  userId: string,
  battleId: string,
  brandId: string,
): Promise<{ liked: boolean }> {
  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.battleId, battleId), eq(likes.brandId, brandId)))
    .limit(1);

  if (existing) {
    await db.delete(likes).where(eq(likes.id, existing.id));
    return { liked: false };
  }
  // onConflictDoNothing: a double-tap racing two requests shouldn't 500 or
  // double-insert — the unique index is the real backstop.
  await db.insert(likes).values({ battleId, brandId, userId }).onConflictDoNothing();
  return { liked: true };
}

// Phase 13: solo-pitch and reaction likes — same "one heart per user per
// thing" concept as toggleLikeForUser above, just keyed on soloPitchId/
// reactionId instead of (battleId, brandId). Two small functions rather
// than generalizing toggleLikeForUser's signature: the battle-side case is
// keyed by a compound (battleId, brandId), these by a single id, and
// forcing one shape onto both would need an awkward discriminated union for
// no real gain — see likes_solo_pitch_user_unique_idx / _reaction_ in
// schema.ts for the constraints backing this.

export async function getSoloPitchLikeCount(soloPitchId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(likes).where(eq(likes.soloPitchId, soloPitchId));
  return row?.n ?? 0;
}

export async function getSoloPitchLikeCounts(soloPitchIds: string[]): Promise<Map<string, number>> {
  if (soloPitchIds.length === 0) return new Map();
  const rows = await db
    .select({ soloPitchId: likes.soloPitchId, n: count() })
    .from(likes)
    .where(inArray(likes.soloPitchId, soloPitchIds))
    .groupBy(likes.soloPitchId);
  return new Map(rows.map((r) => [r.soloPitchId as string, r.n]));
}

export async function getUserLikedSoloPitchIds(userId: string, soloPitchIds: string[]): Promise<Set<string>> {
  if (soloPitchIds.length === 0) return new Set();
  const rows = await db
    .select({ soloPitchId: likes.soloPitchId })
    .from(likes)
    .where(and(eq(likes.userId, userId), inArray(likes.soloPitchId, soloPitchIds)));
  return new Set(rows.map((r) => r.soloPitchId as string));
}

export async function toggleSoloPitchLikeForUser(
  userId: string,
  soloPitchId: string,
  brandId: string,
): Promise<{ liked: boolean; count: number }> {
  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.soloPitchId, soloPitchId)))
    .limit(1);

  if (existing) {
    await db.delete(likes).where(eq(likes.id, existing.id));
  } else {
    await db.insert(likes).values({ soloPitchId, brandId, userId }).onConflictDoNothing();
  }
  const likeCount = await getSoloPitchLikeCount(soloPitchId);
  return { liked: !existing, count: likeCount };
}

export async function toggleReactionLikeForUser(
  userId: string,
  reactionId: string,
  /** Null bei Community-Reaktionen — der Like zählt dann für keine Marke. */
  brandId: string | null,
): Promise<{ liked: boolean; count: number }> {
  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.reactionId, reactionId)))
    .limit(1);

  if (existing) {
    await db.delete(likes).where(eq(likes.id, existing.id));
  } else {
    await db.insert(likes).values({ reactionId, brandId, userId }).onConflictDoNothing();
  }
  const [row] = await db.select({ n: count() }).from(likes).where(eq(likes.reactionId, reactionId));
  return { liked: !existing, count: row?.n ?? 0 };
}
