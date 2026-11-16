import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { battles, hiddenContent, soloPitches } from "@/db/schema";

// Luca 16.11. (Phasen-Map 3.2): „Nicht interessiert“. Der Inhalt verschwindet
// für dieses Konto aus dem Feed, die Marke rutscht im Ranking nach hinten
// (lib/feed-ranking.ts). Profil-Seiten zeigen weiter alles.

export type HiddenTarget = { targetType: "pitch" | "battle"; targetId: string };

/** Schlüssel `pitch:<id>` / `battle:<id>` aller ausgeblendeten Inhalte. */
export async function getHiddenKeys(viewerId: string | null): Promise<Set<string>> {
  if (!viewerId) return new Set();
  try {
    const rows = await db
      .select({ t: hiddenContent.targetType, id: hiddenContent.targetId })
      .from(hiddenContent)
      .where(eq(hiddenContent.userId, viewerId));
    return new Set(rows.map((r) => `${r.t}:${r.id}`));
  } catch (err) {
    console.error("[hidden] getHiddenKeys failed:", err);
    return new Set();
  }
}

/** Marken, bei denen das Konto schon „Nicht interessiert“ gewählt hat. */
export async function getNotInterestedBrandIds(viewerId: string): Promise<Set<string>> {
  const rows = await db
    .select({ brandId: hiddenContent.brandId })
    .from(hiddenContent)
    .where(and(eq(hiddenContent.userId, viewerId), isNotNull(hiddenContent.brandId)));
  return new Set(rows.flatMap((r) => (r.brandId ? [r.brandId] : [])));
}

export async function hideContent(userId: string, target: HiddenTarget): Promise<boolean> {
  let brandId: string | null = null;
  if (target.targetType === "pitch") {
    const [p] = await db.select({ brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, target.targetId)).limit(1);
    if (!p) return false;
    brandId = p.brandId;
  } else {
    const [b] = await db.select({ id: battles.id }).from(battles).where(eq(battles.id, target.targetId)).limit(1);
    if (!b) return false;
  }
  await db.insert(hiddenContent).values({ userId, ...target, brandId }).onConflictDoNothing();
  return true;
}

export async function unhideContent(userId: string, target: HiddenTarget): Promise<void> {
  await db
    .delete(hiddenContent)
    .where(and(eq(hiddenContent.userId, userId), eq(hiddenContent.targetType, target.targetType), eq(hiddenContent.targetId, target.targetId)));
}
