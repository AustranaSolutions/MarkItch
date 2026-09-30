import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, userBlocks, users } from "@/db/schema";

// RN-7: Blockieren (App-Store-Richtlinie 1.2). Siehe userBlocks in schema.ts.

export type BlockedIds = { userIds: Set<string>; brandIds: Set<string> };

const EMPTY: BlockedIds = { userIds: new Set(), brandIds: new Set() };

/**
 * Wen dieser Nutzer blockiert hat — als Konten und als Marken (jede Marke,
 * zu der mindestens ein blockiertes Konto gehört). Fail-soft: fehlt die
 * Tabelle (Deploy vor /api/admin/migrate), wird eben nichts ausgeblendet —
 * der Feed darf daran nie scheitern.
 */
export async function getBlockedIds(viewerId: string | null): Promise<BlockedIds> {
  if (!viewerId) return EMPTY;
  try {
    const rows = await db
      .select({ userId: userBlocks.blockedUserId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerUserId, viewerId));
    if (rows.length === 0) return EMPTY;
    const userIds = new Set(rows.map((r) => r.userId));
    const brandRows = await db
      .select({ brandId: brandMembers.brandId })
      .from(brandMembers)
      .where(inArray(brandMembers.userId, [...userIds]));
    return { userIds, brandIds: new Set(brandRows.map((r) => r.brandId)) };
  } catch (err) {
    console.error("[block] getBlockedIds failed:", err);
    return EMPTY;
  }
}

async function brandMemberIds(brandId: string): Promise<string[]> {
  const rows = await db.select({ userId: brandMembers.userId }).from(brandMembers).where(eq(brandMembers.brandId, brandId));
  return rows.map((r) => r.userId);
}

export type BlockResult = { ok: true } | { ok: false; error: string };

export async function blockUserFor(viewerId: string, blockedUserId: string): Promise<BlockResult> {
  if (blockedUserId === viewerId) return { ok: false, error: "Du kannst dich nicht selbst blockieren." };
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, blockedUserId)).limit(1);
  if (!target) return { ok: false, error: "Dieses Konto gibt es nicht." };
  await db.insert(userBlocks).values({ blockerUserId: viewerId, blockedUserId }).onConflictDoNothing();
  return { ok: true };
}

export async function blockBrandFor(viewerId: string, brandId: string): Promise<BlockResult> {
  const memberIds = (await brandMemberIds(brandId)).filter((id) => id !== viewerId);
  if (memberIds.length === 0) return { ok: false, error: "Diese Marke kannst du nicht blockieren." };
  await db
    .insert(userBlocks)
    .values(memberIds.map((blockedUserId) => ({ blockerUserId: viewerId, blockedUserId })))
    .onConflictDoNothing();
  return { ok: true };
}

export async function unblockUserFor(viewerId: string, blockedUserId: string): Promise<void> {
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerUserId, viewerId), eq(userBlocks.blockedUserId, blockedUserId)));
}

export async function unblockBrandFor(viewerId: string, brandId: string): Promise<void> {
  const memberIds = await brandMemberIds(brandId);
  if (memberIds.length === 0) return;
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerUserId, viewerId), inArray(userBlocks.blockedUserId, memberIds)));
}

export type BlockedEntry =
  | { kind: "brand"; brandId: string; name: string; slug: string; logoUrl: string | null }
  | { kind: "user"; userId: string; name: string };

/** Für „Blockierte Konten" in den Einstellungen — Marken zusammengefasst, sonst Kontoname. */
export async function listBlocksFor(viewerId: string): Promise<BlockedEntry[]> {
  const rows = await db
    .select({ userId: users.id, name: users.name, email: users.email })
    .from(userBlocks)
    .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
    .where(eq(userBlocks.blockerUserId, viewerId));
  if (rows.length === 0) return [];
  const brandRows = await db
    .select({ userId: brandMembers.userId, brandId: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl })
    .from(brandMembers)
    .innerJoin(brands, eq(brandMembers.brandId, brands.id))
    .where(inArray(brandMembers.userId, rows.map((r) => r.userId)));

  const entries: BlockedEntry[] = [];
  const seenBrands = new Set<string>();
  for (const row of rows) {
    const brand = brandRows.find((b) => b.userId === row.userId);
    if (brand) {
      if (seenBrands.has(brand.brandId)) continue;
      seenBrands.add(brand.brandId);
      entries.push({ kind: "brand", brandId: brand.brandId, name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl });
    } else {
      entries.push({ kind: "user", userId: row.userId, name: row.name || row.email.split("@")[0] });
    }
  }
  return entries;
}
