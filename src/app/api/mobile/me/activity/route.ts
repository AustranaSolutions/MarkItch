import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getViewerActivity } from "@/lib/viewer-activity";
import { unauthorized } from "@/lib/mobile-auth";
import { enrichCommunityReactions, getCommunityReactionRowsForUser } from "@/lib/community-feed";
import { getThumbnailMap } from "@/lib/video-thumbnails";

// Luca 11.10.: Zuschauer-Profil in der App — eigene Aktivität, Serie,
// Geschmacks-Profil und eigene Reaktionsvideos. Nur für das eigene Konto.
export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const [activity, rows] = await Promise.all([getViewerActivity(viewer.id), getCommunityReactionRowsForUser(viewer.id)]);
  // Luca 02.11.: Kacheln mit eigenem Titelbild; `reactionItems` = volle Feed-Karten,
  // damit Antippen die Reaktion wie im Feed öffnet (nicht die ganze Reaktions-Seite).
  const [reactionItems, thumbnails] = await Promise.all([
    enrichCommunityReactions(viewer.id, rows),
    getThumbnailMap(activity.reactions.map((r) => r.videoUrl)),
  ]);
  return NextResponse.json({
    ...activity,
    reactions: activity.reactions.map((r) => ({ ...r, thumbnailUrl: thumbnails.get(r.videoUrl) ?? null })),
    reactionItems,
  });
}
