import "server-only";
import { count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, comments, users } from "@/db/schema";
import { getBlockedIds } from "@/lib/block";

export type CommentWithAuthor = {
  id: string;
  content: string;
  createdAt: Date;
  authorName: string;
  /** RN-7: damit die App „Verfasser blockieren" anbieten kann. */
  authorId: string;
  /** Luca 05.10.: Kommentiert ein Marken-Konto, erscheint die Marke (nicht der Personenname). */
  authorBrand: { id: string; slug: string; verified: boolean } | null;
};

/**
 * Gemeinsame Abfrage der drei Kommentar-Listen. RN-7: Kommentare von
 * Konten, die der Betrachter blockiert hat, fehlen für ihn.
 */
async function loadComments(where: SQL, viewerId: string | null): Promise<CommentWithAuthor[]> {
  const [rows, blocked] = await Promise.all([
    db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        userId: comments.userId,
        name: users.name,
        email: users.email,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
        brandVerifiedAt: brands.verifiedAt,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .leftJoin(brandMembers, eq(brandMembers.userId, users.id))
      .leftJoin(brands, eq(brandMembers.brandId, brands.id))
      .where(where)
      .orderBy(desc(comments.createdAt)),
    getBlockedIds(viewerId),
  ]);

  // Ein Konto gehört heute zu höchstens einer Marke; bei späteren Teams
  // (mehrere Marken pro Konto) nicht doppelt listen.
  const seen = new Set<string>();
  return rows
    .filter((row) => !blocked.userIds.has(row.userId) && !(row.brandId && blocked.brandIds.has(row.brandId)))
    .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)))
    .map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      // Most accounts have no display name set yet — the email's local part
      // reads better than "—" under a comment.
      authorName: row.brandName ?? (row.name || row.email.split("@")[0]),
      authorId: row.userId,
      authorBrand: row.brandId && row.brandSlug ? { id: row.brandId, slug: row.brandSlug, verified: row.brandVerifiedAt !== null } : null,
    }));
}

/** Newest first — a live feed under the Pitch, not a slow-to-load thread. */
export async function getCommentsForBattle(battleId: string, viewerId: string | null = null): Promise<CommentWithAuthor[]> {
  return loadComments(eq(comments.battleId, battleId), viewerId);
}

/** Comment counts for a batch of battles — one query for a whole feed page. */
export async function getCommentCounts(battleIds: string[]): Promise<Map<string, number>> {
  if (battleIds.length === 0) return new Map();
  const rows = await db
    .select({ battleId: comments.battleId, n: count() })
    .from(comments)
    .where(inArray(comments.battleId, battleIds))
    .groupBy(comments.battleId);
  return new Map(rows.map((row) => [row.battleId as string, row.n]));
}

/** Phase 13: same as getCommentsForBattle, keyed on a solo pitch instead. */
export async function getCommentsForSoloPitch(soloPitchId: string, viewerId: string | null = null): Promise<CommentWithAuthor[]> {
  return loadComments(eq(comments.soloPitchId, soloPitchId), viewerId);
}

export async function getCommentCountsForSoloPitches(soloPitchIds: string[]): Promise<Map<string, number>> {
  if (soloPitchIds.length === 0) return new Map();
  const rows = await db
    .select({ soloPitchId: comments.soloPitchId, n: count() })
    .from(comments)
    .where(inArray(comments.soloPitchId, soloPitchIds))
    .groupBy(comments.soloPitchId);
  return new Map(rows.map((row) => [row.soloPitchId as string, row.n]));
}

/** Phase 40: same as getCommentsForSoloPitch, keyed on a reaction instead — reactions get the same like/comment/share/report set as everywhere else. */
export async function getCommentsForReaction(reactionId: string, viewerId: string | null = null): Promise<CommentWithAuthor[]> {
  return loadComments(eq(comments.reactionId, reactionId), viewerId);
}

export async function getCommentCountsForReactions(reactionIds: string[]): Promise<Map<string, number>> {
  if (reactionIds.length === 0) return new Map();
  const rows = await db
    .select({ reactionId: comments.reactionId, n: count() })
    .from(comments)
    .where(inArray(comments.reactionId, reactionIds))
    .groupBy(comments.reactionId);
  return new Map(rows.map((row) => [row.reactionId as string, row.n]));
}
