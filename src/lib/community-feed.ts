import "server-only";
import { and, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { brands, likes, reactions, soloPitches, users } from "@/db/schema";
import { getCommentCountsForReactions } from "@/lib/comment";
import { getAutoHiddenTargetIds } from "@/lib/moderation";
import { getBlockedIds } from "@/lib/block";
import { communityName } from "@/lib/reaction";

/**
 * Phase E (Luca 04.10.): Reaktionen von Zuschauern laufen im „Für dich“-Feed
 * mit — gekennzeichnet als „Community“ (keine Anzeige) und mit Hinweis,
 * worauf reagiert wurde, plus Weg zum Original. Marken-Reaktionen bleiben
 * wie bisher auf der Reaktions-Seite des Videos.
 */
export type FeedReaction = {
  kind: "reaction";
  key: string; // `reaction:${reactionId}`
  reactionId: string;
  soloPitchId: string;
  parentReactionId: string | null;
  authorUserId: string;
  authorName: string;
  /** Die Marke, deren Video die Reaktion gilt. */
  original: { brandId: string; brandName: string; brandSlug: string };
  videoUrl: string;
  likeCount: number;
  viewerLiked: boolean;
  viewerIsAuthor: boolean;
  commentCount: number;
  containsAiContent: boolean;
  createdAt: string; // ISO
};

export async function buildFeedCommunityReactions(viewerId: string | null): Promise<FeedReaction[]> {
  const [allRows, autoHiddenIds, blocked] = await Promise.all([
    db
      .select({
        reaction: reactions,
        userName: users.name,
        userEmail: users.email,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
      .from(reactions)
      .innerJoin(users, eq(reactions.userId, users.id))
      .innerJoin(soloPitches, eq(reactions.soloPitchId, soloPitches.id))
      .innerJoin(brands, eq(soloPitches.brandId, brands.id))
      .where(isNotNull(reactions.userId))
      .orderBy(desc(reactions.createdAt)),
    getAutoHiddenTargetIds(["reaction"]),
    getBlockedIds(viewerId),
  ]);
  const rows = allRows.filter(
    (r) =>
      !autoHiddenIds.has(r.reaction.id) &&
      !blocked.userIds.has(r.reaction.userId!) &&
      !blocked.brandIds.has(r.brandId),
  );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.reaction.id);
  const [likeRows, viewerLikedRows, commentCounts] = await Promise.all([
    db.select({ reactionId: likes.reactionId, n: count() }).from(likes).where(inArray(likes.reactionId, ids)).groupBy(likes.reactionId),
    viewerId
      ? db
          .select({ reactionId: likes.reactionId })
          .from(likes)
          .where(and(eq(likes.userId, viewerId), inArray(likes.reactionId, ids)))
      : Promise.resolve([]),
    getCommentCountsForReactions(ids),
  ]);
  const likeCounts = new Map(likeRows.map((r) => [r.reactionId, r.n]));
  const viewerLiked = new Set(viewerLikedRows.map((r) => r.reactionId));

  return rows.map((r) => ({
    kind: "reaction",
    key: `reaction:${r.reaction.id}`,
    reactionId: r.reaction.id,
    soloPitchId: r.reaction.soloPitchId,
    parentReactionId: r.reaction.parentReactionId,
    authorUserId: r.reaction.userId!,
    authorName: communityName(r.userName, r.userEmail),
    original: { brandId: r.brandId, brandName: r.brandName, brandSlug: r.brandSlug },
    videoUrl: r.reaction.videoUrl,
    likeCount: likeCounts.get(r.reaction.id) ?? 0,
    viewerLiked: viewerLiked.has(r.reaction.id),
    viewerIsAuthor: viewerId === r.reaction.userId,
    commentCount: commentCounts.get(r.reaction.id) ?? 0,
    containsAiContent: r.reaction.containsAiContent,
    createdAt: r.reaction.createdAt.toISOString(),
  }));
}
