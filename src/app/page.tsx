import { getOptionalUser } from "@/lib/session";
import { getForYouFeedWithReactions, getFeedDuelById, getFeedSoloPitchById, type FeedItemWithReactions } from "@/lib/feed";
import { getBrandForUser } from "@/lib/brand";
import { FeedClient } from "@/components/feed/feed-client";

// Phase 9: the home screen IS the feed now — full-screen, scrollable,
// TikTok/Reels-style. Always live data (never prerendered), same reason as
// /pitches and /brands: a new Pitch or like should show up without a
// redeploy, and getOptionalUser() already makes this dynamic anyway.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ battle?: string; pitch?: string; posted?: string }>;
}) {
  const { battle: focusBattleId, pitch: focusSoloPitchId, posted } = await searchParams;
  const user = await getOptionalUser();
  const [firstPage, viewerBrand] = await Promise.all([
    // Luca 05.11.: Community-Reaktionen laufen auch auf der Website mit (wie in der App).
    getForYouFeedWithReactions(user?.id ?? null, 0, 6),
    user ? getBrandForUser(user.id) : Promise.resolve(null),
  ]);

  // Phase 10: a link from the notifications screen (or a reminder that just
  // went live) opens the Feed already scrolled to that one Pitch — if it
  // didn't happen to land on page 1 of the trending order, fetch it
  // directly and splice it in so FeedClient always has it to scroll to.
  // Phase 13: same idea for a solo pitch's share link.
  let items: FeedItemWithReactions[] = firstPage.items;
  if (focusBattleId && !items.some((i) => i.kind === "duel" && i.battleId === focusBattleId)) {
    const focusDuel = await getFeedDuelById(user?.id ?? null, focusBattleId);
    if (focusDuel) items = [focusDuel, ...items];
  }
  if (focusSoloPitchId && !items.some((i) => i.kind === "solo" && i.soloPitchId === focusSoloPitchId)) {
    const focusPitch = await getFeedSoloPitchById(user?.id ?? null, focusSoloPitchId);
    if (focusPitch) items = [focusPitch, ...items];
  }

  return (
    <FeedClient
      initialItems={items}
      initialTotal={firstPage.total}
      isLoggedIn={Boolean(user)}
      viewerBrandId={viewerBrand?.id ?? null}
      focusBattleId={focusBattleId ?? focusSoloPitchId ?? null}
      resetScroll={Boolean(posted)}
    />
  );
}
