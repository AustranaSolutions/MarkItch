import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { battles, savedVideos, soloPitches } from "@/db/schema";
import { getFeedItemsByKeys, type FeedItem } from "@/lib/feed";

// Luca 16.11. (Phasen-Map 3.1): „Für später“ — Videos merken (zusammen mit
// „Meine Codes“ an einem Ort). Bewusst kein Lesezeichen-Konzept wie bei Instagram.

export type SavedTarget = { targetType: "pitch" | "battle"; targetId: string };

export async function saveVideo(userId: string, target: SavedTarget): Promise<boolean> {
  const exists =
    target.targetType === "pitch"
      ? await db.select({ id: soloPitches.id }).from(soloPitches).where(eq(soloPitches.id, target.targetId)).limit(1)
      : await db.select({ id: battles.id }).from(battles).where(eq(battles.id, target.targetId)).limit(1);
  if (exists.length === 0) return false;
  await db.insert(savedVideos).values({ userId, ...target }).onConflictDoNothing();
  return true;
}

export async function unsaveVideo(userId: string, target: SavedTarget): Promise<void> {
  await db
    .delete(savedVideos)
    .where(and(eq(savedVideos.userId, userId), eq(savedVideos.targetType, target.targetType), eq(savedVideos.targetId, target.targetId)));
}

/** Gemerkte Videos als volle Feed-Karten, zuletzt gemerkt zuerst (gelöschte fallen weg). */
export async function getSavedFeedItems(userId: string): Promise<FeedItem[]> {
  const rows = await db
    .select({ t: savedVideos.targetType, id: savedVideos.targetId })
    .from(savedVideos)
    .where(eq(savedVideos.userId, userId))
    .orderBy(desc(savedVideos.createdAt))
    .limit(200);
  return getFeedItemsByKeys(userId, rows.map((r) => ({ type: r.t === "battle" ? "battle" : "pitch", id: r.id })));
}
