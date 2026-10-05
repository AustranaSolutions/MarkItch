import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { reactions, brands, likes, battles, soloPitches, users, type Reaction } from "@/db/schema";
import { getExistingOpenBattle } from "@/lib/battle";
import { activateBattleIfBothSidesReady } from "@/lib/battle-stage";
import { DEFAULT_DUEL_CATEGORY } from "@/lib/battle-format";
import { getCommentCountsForReactions } from "@/lib/comment";
import { getAutoHiddenTargetIds } from "@/lib/moderation";
import { getBlockedIds } from "@/lib/block";

export type ReactionBrand = { id: string; name: string; slug: string; logoUrl: string | null };

/** Phase E: Reaktion eines Zuschauer-Kontos („Community“) statt einer Marke. */
export type ReactionCommunityAuthor = { userId: string; name: string };

export type ReactionWithBrand = Reaction & {
  /** Null bei Community-Reaktionen (dann ist `community` gesetzt). */
  brand: ReactionBrand | null;
  community: ReactionCommunityAuthor | null;
  likeCount: number;
  viewerLiked: boolean;
  commentCount: number;
};


/** Reactions to a solo pitch, best-liked first — "beste Antwort" per §6. */
export async function getReactionsForSoloPitch(soloPitchId: string, viewerId: string | null): Promise<ReactionWithBrand[]> {
  const [allRows, autoHiddenIds, blocked] = await Promise.all([
    db
      .select({
        reaction: reactions,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
        brandLogoUrl: brands.logoUrl,
        userName: users.name,
        userEmail: users.email,
      })
      .from(reactions)
      .leftJoin(brands, eq(reactions.brandId, brands.id))
      .leftJoin(users, eq(reactions.userId, users.id))
      .where(eq(reactions.soloPitchId, soloPitchId))
      .orderBy(desc(reactions.createdAt)),
    getAutoHiddenTargetIds(["reaction"]),
    getBlockedIds(viewerId),
  ]);
  // Phase 46: siehe buildFeedDuels — mehrere unterschiedliche Meldende → automatisch pausiert.
  // RN-7: dazu Reaktionen blockierter Marken.
  const rows = allRows.filter(
    (r) =>
      !autoHiddenIds.has(r.reaction.id) &&
      !(r.brandId && blocked.brandIds.has(r.brandId)) &&
      !(r.reaction.userId && blocked.userIds.has(r.reaction.userId)),
  );
  if (rows.length === 0) return [];

  const reactionIds = rows.map((r) => r.reaction.id);
  const [likeCountRows, viewerLikedRows, commentCountById] = await Promise.all([
    db
      .select({ reactionId: likes.reactionId, n: count() })
      .from(likes)
      .where(inArray(likes.reactionId, reactionIds))
      .groupBy(likes.reactionId),
    viewerId
      ? db
          .select({ reactionId: likes.reactionId })
          .from(likes)
          .where(and(eq(likes.userId, viewerId), inArray(likes.reactionId, reactionIds)))
      : Promise.resolve([]),
    getCommentCountsForReactions(reactionIds),
  ]);
  const likeCountById = new Map(likeCountRows.map((r) => [r.reactionId, r.n]));
  const viewerLikedSet = new Set(viewerLikedRows.map((r) => r.reactionId));

  return rows
    .map((r) => ({
      ...r.reaction,
      brand: r.brandId ? { id: r.brandId, name: r.brandName!, slug: r.brandSlug!, logoUrl: r.brandLogoUrl } : null,
      community:
        r.reaction.userId && !r.brandId
          ? { userId: r.reaction.userId, name: communityName(r.userName, r.userEmail) }
          : null,
      likeCount: likeCountById.get(r.reaction.id) ?? 0,
      viewerLiked: viewerLikedSet.has(r.reaction.id),
      commentCount: commentCountById.get(r.reaction.id) ?? 0,
    }))
    .sort((a, b) => b.likeCount - a.likeCount || a.createdAt.getTime() - b.createdAt.getTime());
}

/** Wie bei Kommentaren: nie die volle E-Mail öffentlich, höchstens der Teil vor dem @. */
export function communityName(name: string | null, email: string | null): string {
  return name || email?.split("@")[0] || "Jemand";
}

export async function getReactionCounts(soloPitchIds: string[]): Promise<Map<string, number>> {
  if (soloPitchIds.length === 0) return new Map();
  const rows = await db
    .select({ soloPitchId: reactions.soloPitchId, n: count() })
    .from(reactions)
    .where(inArray(reactions.soloPitchId, soloPitchIds))
    .groupBy(reactions.soloPitchId);
  return new Map(rows.map((r) => [r.soloPitchId, r.n]));
}

export async function getReactionById(id: string): Promise<Reaction | null> {
  const [row] = await db.select().from(reactions).where(eq(reactions.id, id)).limit(1);
  return row ?? null;
}

/**
 * The original brand upgrades an already-posted, already-liked reaction
 * straight to an official Duell — both videos exist already, so this just
 * inserts an already-'open'-mode battle and activates it right away, same
 * as any other pre-filled battle. Returns the new battle's id.
 */
export async function promoteReactionToBattle(reactionId: string, actingBrandId: string): Promise<string> {
  const [reaction] = await db.select().from(reactions).where(eq(reactions.id, reactionId)).limit(1);
  if (!reaction) throw new Error("Diese Reaktion existiert nicht.");
  if (reaction.promotedToBattleId) throw new Error("Diese Reaktion ist bereits ein offizielles Duell.");
  // Phase 40: only a direct reaction to the pitch can become a Duell
  // against the pitch's own brand — a reply deep in a chain is between
  // whichever two brands are actually replying to each other, which this
  // function (soloPitch.brandId vs. reaction.brandId) isn't set up for.
  if (reaction.parentReactionId) throw new Error("Nur eine direkte Reaktion auf den Pitch kann hochgestuft werden.");
  // Phase E: ein Duell gibt es nur zwischen zwei Marken.
  if (!reaction.brandId) throw new Error("Nur die Reaktion einer Marke kann ein Duell werden.");
  const reactionBrandId = reaction.brandId;

  const [soloPitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, reaction.soloPitchId)).limit(1);
  if (!soloPitch) throw new Error("Der zugehörige Pitch existiert nicht mehr.");
  if (soloPitch.brandId !== actingBrandId) throw new Error("Nur die Original-Marke kann eine Reaktion hochstufen.");

  const existing = await getExistingOpenBattle(soloPitch.brandId, reactionBrandId);
  if (existing) throw new Error("Zwischen diesen beiden Marken läuft bereits ein Duell.");

  const [battle] = await db
    .insert(battles)
    .values({
      brandAId: soloPitch.brandId,
      brandBId: reactionBrandId,
      mode: "open",
      category: DEFAULT_DUEL_CATEGORY,
      brandAVideoUrl: soloPitch.videoUrl,
      brandASubmittedAt: soloPitch.createdAt,
      brandBVideoUrl: reaction.videoUrl,
      brandBSubmittedAt: reaction.createdAt,
    })
    .returning();

  await db.update(reactions).set({ promotedToBattleId: battle.id }).where(eq(reactions.id, reactionId));
  await activateBattleIfBothSidesReady(battle.id);
  return battle.id;
}
