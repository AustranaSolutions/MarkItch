import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getBrandForUser } from "@/lib/brand";
import { getBlockedIds } from "@/lib/block";
import { enrichCommunityReactions, getCommunityReactionRowsForUser, type FeedReaction } from "@/lib/community-feed";
import { getThumbnailMap } from "@/lib/video-thumbnails";
import { getViewerActivity, type ViewerActivity } from "@/lib/viewer-activity";

// Luca 02.11.: Öffentliches Zuschauer-Profil — erreichbar über den Namen bei
// Meinungen und Reaktionen. Zeigt Serie, Zahlen und Reaktionsvideos; das
// Geschmacks-Profil bleibt privat (es verrät, wie jemand abstimmt).

export type PublicViewerProfile =
  | { kind: "brand"; brandSlug: string }
  | {
      kind: "viewer";
      user: { id: string; name: string; avatarUrl: string | null };
      activity: Omit<ViewerActivity, "taste" | "reactions"> & {
        reactions: (ViewerActivity["reactions"][number] & { thumbnailUrl: string | null })[];
      };
      reactionItems: FeedReaction[];
    };

/** null = gibt es nicht oder vom Betrachter blockiert. Marken-Konten → Markenprofil. */
export async function getPublicViewerProfile(userId: string, viewerId: string | null): Promise<PublicViewerProfile | null> {
  const [row] = await db.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return null;
  const blocked = await getBlockedIds(viewerId);
  if (blocked.userIds.has(row.id)) return null;
  const brand = await getBrandForUser(row.id);
  if (brand) return { kind: "brand", brandSlug: brand.slug };

  const [activity, rows] = await Promise.all([getViewerActivity(row.id), getCommunityReactionRowsForUser(row.id)]);
  const [reactionItems, thumbnails] = await Promise.all([
    enrichCommunityReactions(viewerId, rows),
    getThumbnailMap(activity.reactions.map((r) => r.videoUrl)),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { taste, ...rest } = activity;
  return {
    kind: "viewer",
    user: { id: row.id, name: row.name?.trim() || "MarkItch-Nutzer", avatarUrl: row.avatarUrl },
    activity: { ...rest, reactions: activity.reactions.map((r) => ({ ...r, thumbnailUrl: thumbnails.get(r.videoUrl) ?? null })) },
    reactionItems,
  };
}
