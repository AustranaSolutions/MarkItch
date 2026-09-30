import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, follows, users } from "@/db/schema";
import { getBrandMemberUserIds } from "@/lib/brand";
import { getActorLabel, notifyUsers } from "@/lib/notification";

export async function isFollowing(userId: string, brandId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.brandId, brandId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Folgen an/aus für einen Nutzer — gemeinsam genutzt von der Web-Action
 * (actions/follow.ts) und der App-Route (/api/follow). Benachrichtigt die
 * Marke nur beim Folgen, nie beim Entfolgen (Phase 35, wie Insta).
 */
export async function toggleFollowForUser(userId: string, brandId: string): Promise<{ following: boolean }> {
  if (await isFollowing(userId, brandId)) {
    await db.delete(follows).where(and(eq(follows.userId, userId), eq(follows.brandId, brandId)));
    return { following: false };
  }
  // onConflictDoNothing: a double-click racing two requests shouldn't 500.
  await db.insert(follows).values({ userId, brandId }).onConflictDoNothing();
  const [memberIds, actor] = await Promise.all([getBrandMemberUserIds(brandId), getActorLabel(userId)]);
  await notifyUsers(memberIds, `${actor.label} folgt dir jetzt.`, actor.link, userId);
  return { following: true };
}

export async function getFollowerCount(brandId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(follows).where(eq(follows.brandId, brandId));
  return row?.n ?? 0;
}

/** Every user following this brand — used to fan out notifications. */
export async function getFollowerUserIds(brandId: string): Promise<string[]> {
  const rows = await db.select({ userId: follows.userId }).from(follows).where(eq(follows.brandId, brandId));
  return rows.map((r) => r.userId);
}

/** Every brand this user follows — used for the feed's "Folge ich" tab. */
export async function getFollowedBrandIds(userId: string): Promise<string[]> {
  const rows = await db.select({ brandId: follows.brandId }).from(follows).where(eq(follows.userId, userId));
  return rows.map((r) => r.brandId);
}

export type FollowerEntry = { userId: string; label: string; link: string | null };

/**
 * Phase 35: who follows this brand, newest first — Luca: "ich habe einen
 * Follower aber kann nicht sehen wer." A follower is a `user` (Acro or
 * Assent), not necessarily a brand — shown by their own brand name/link if
 * they have one, else their account name/email with no link, same labeling
 * as notification.ts's getActorLabel (kept separate/batched here instead of
 * calling that N times for a whole list).
 */
export async function getFollowersForBrand(brandId: string): Promise<FollowerEntry[]> {
  const rows = await db
    .select({ userId: follows.userId })
    .from(follows)
    .where(eq(follows.brandId, brandId))
    .orderBy(follows.createdAt);
  if (rows.length === 0) return [];
  const userIds = rows.map((r) => r.userId);

  const [brandRows, userRows] = await Promise.all([
    db
      .select({ userId: brandMembers.userId, name: brands.name, slug: brands.slug })
      .from(brandMembers)
      .innerJoin(brands, eq(brandMembers.brandId, brands.id))
      .where(inArray(brandMembers.userId, userIds)),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, userIds)),
  ]);
  const brandByUser = new Map(brandRows.map((r) => [r.userId, r]));
  const userById = new Map(userRows.map((r) => [r.id, r]));

  return rows.reverse().map((r) => {
    const brand = brandByUser.get(r.userId);
    if (brand) return { userId: r.userId, label: brand.name, link: `/brands/${brand.slug}` };
    const user = userById.get(r.userId);
    // Nie die volle E-Mail öffentlich zeigen (die Liste ist für alle sichtbar) —
    // wie bei Kommentaren nur der Teil vor dem @.
    return { userId: r.userId, label: user?.name || user?.email?.split("@")[0] || "Jemand", link: null };
  });
}

export type FollowedBrandEntry = { id: string; name: string; slug: string; logoUrl: string | null };

/** Every brand followed by any member of this brand (almost always one owner) — the "folgt X" side of a profile. */
export async function getFollowingForBrand(brandId: string): Promise<FollowedBrandEntry[]> {
  const memberIds = await getBrandMemberUserIds(brandId);
  if (memberIds.length === 0) return [];
  const rows = await db
    .selectDistinct({ id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl })
    .from(follows)
    .innerJoin(brands, eq(follows.brandId, brands.id))
    .where(inArray(follows.userId, memberIds));
  return rows;
}

export async function getFollowingCountForBrand(brandId: string): Promise<number> {
  const memberIds = await getBrandMemberUserIds(brandId);
  if (memberIds.length === 0) return 0;
  const [row] = await db
    .select({ n: count() })
    .from(follows)
    .where(inArray(follows.userId, memberIds));
  return row?.n ?? 0;
}
