import "server-only";
import { count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { battles, brandMembers, brands, comments, reactions, soloPitches, users } from "@/db/schema";
import { isUuid } from "@/lib/mobile-auth";
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
  /** Phase F: eigener Kommentar oder Kommentar unter dem eigenen Video → Löschen anbieten. */
  viewerCanDelete: boolean;
};

type CommentTarget = { battleId?: string | null; soloPitchId?: string | null; reactionId?: string | null };

/**
 * Phase F: Konten, denen das kommentierte Video gehört — Mitglieder der
 * Marke(n) bzw. bei einer Community-Reaktion das Zuschauer-Konto. Sie dürfen
 * Kommentare darunter löschen (wie bei Instagram/TikTok).
 */
async function getTargetOwnerUserIds(target: CommentTarget): Promise<Set<string>> {
  let brandIds: string[] = [];
  const userIds: string[] = [];
  if (target.battleId) {
    const [row] = await db
      .select({ a: battles.brandAId, b: battles.brandBId })
      .from(battles)
      .where(eq(battles.id, target.battleId))
      .limit(1);
    if (row) brandIds = [row.a, row.b];
  } else if (target.soloPitchId) {
    const [row] = await db.select({ brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, target.soloPitchId)).limit(1);
    if (row) brandIds = [row.brandId];
  } else if (target.reactionId) {
    const [row] = await db
      .select({ brandId: reactions.brandId, userId: reactions.userId })
      .from(reactions)
      .where(eq(reactions.id, target.reactionId))
      .limit(1);
    if (row?.brandId) brandIds = [row.brandId];
    if (row?.userId) userIds.push(row.userId);
  }
  const members = brandIds.length
    ? await db.select({ userId: brandMembers.userId }).from(brandMembers).where(inArray(brandMembers.brandId, brandIds))
    : [];
  return new Set([...userIds, ...members.map((m) => m.userId)]);
}

export type DeleteCommentResult = { ok: true; target: CommentTarget } | { ok: false; error: string };

/** Phase F: eigenen Kommentar oder einen unter dem eigenen Video löschen. */
export async function deleteCommentFor(userId: string, commentId: string): Promise<DeleteCommentResult> {
  if (!isUuid(commentId)) return { ok: false, error: "Ungültige Anfrage." };
  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!comment) return { ok: false, error: "Dieser Kommentar existiert nicht mehr." };
  if (comment.userId !== userId) {
    const owners = await getTargetOwnerUserIds(comment);
    if (!owners.has(userId)) return { ok: false, error: "Du darfst diesen Kommentar nicht löschen." };
  }
  await db.delete(comments).where(eq(comments.id, commentId));
  return {
    ok: true,
    target: { battleId: comment.battleId, soloPitchId: comment.soloPitchId, reactionId: comment.reactionId },
  };
}

/**
 * Gemeinsame Abfrage der drei Kommentar-Listen. RN-7: Kommentare von
 * Konten, die der Betrachter blockiert hat, fehlen für ihn.
 */
async function loadComments(where: SQL, viewerId: string | null, target: CommentTarget): Promise<CommentWithAuthor[]> {
  const [rows, blocked, owners] = await Promise.all([
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
    viewerId ? getTargetOwnerUserIds(target) : Promise.resolve(new Set<string>()),
  ]);
  const viewerOwnsTarget = viewerId !== null && owners.has(viewerId);

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
      viewerCanDelete: viewerOwnsTarget || row.userId === viewerId,
    }));
}

/** Newest first — a live feed under the Pitch, not a slow-to-load thread. */
export async function getCommentsForBattle(battleId: string, viewerId: string | null = null): Promise<CommentWithAuthor[]> {
  return loadComments(eq(comments.battleId, battleId), viewerId, { battleId });
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
  return loadComments(eq(comments.soloPitchId, soloPitchId), viewerId, { soloPitchId });
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
  return loadComments(eq(comments.reactionId, reactionId), viewerId, { reactionId });
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
