"use client";

import { useCleanScreen } from "@/lib/clean-screen";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedDuel, FeedItemWithReactions, FeedSoloPitch } from "@/lib/feed";
import type { FeedReaction } from "@/lib/community-feed";
import { FeedCommunityCard } from "@/components/feed/feed-community-card";
import { FeedDuelCard } from "@/components/feed/feed-duel-card";
import { FeedSoloPitchCard } from "@/components/feed/feed-solo-pitch-card";
import { CommentSheet, type CommentTarget } from "@/components/feed/comment-sheet";
import { ReactionsOverlay } from "@/components/pitches/reactions-overlay";
import { getNotificationPermission, subscribeToPush } from "@/lib/push-client";
import { useT } from "@/components/i18n/lang-provider";

type Tab = "foryou" | "following";

// Phase 30: Luca's report — leaving the feed for /profile and coming back
// scrolled all the way back to the top, forcing a full re-scroll every
// time. The feed lives at the app's root route with no persistent layout
// keeping it mounted across navigations (see CLAUDE-CODE-UEBERGABE.md), so
// this remembers the scroll offset in sessionStorage (survives navigation,
// cleared when the tab closes) and restores it on mount instead.
const SCROLL_STORAGE_KEY = "markitch:feed:scrollTop";

// Phase 43: every item ever scrolled past stayed mounted (a duel card
// mounts *two* <video> elements, always, for the drag-carousel), growing
// without bound as the "load more" sentinel kept appending — on a real
// phone that's real, unrecoverable memory pressure, not just a perf nit,
// and the crash it caused ("erst lädt, dann schwarz, nichts geht mehr")
// is exactly what a WKWebView content-process kill from memory pressure
// looks like from the outside. Only cards within this many positions of
// the currently active one stay mounted; the rest fall back to a plain
// same-sized placeholder div so scroll-snap positions don't shift.
const FEED_WINDOW = 2;

export function FeedClient({
  initialItems,
  initialTotal,
  isLoggedIn,
  viewerBrandId,
  focusBattleId,
  resetScroll,
}: {
  initialItems: FeedItemWithReactions[];
  initialTotal: number;
  isLoggedIn: boolean;
  /** Viewer's own brand id, if they have one — gates "Pitch schicken"/"Hochstufen" without a per-card query. */
  viewerBrandId?: string | null;
  focusBattleId?: string | null;
  /** Phase 30: true right after posting — land on the fresh post at the top instead of restoring an old scroll offset. */
  resetScroll?: boolean;
}) {
  const t = useT();
  const cleanScreen = useCleanScreen();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("foryou");
  const [items, setItems] = useState<FeedItemWithReactions[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [followsAnyone, setFollowsAnyone] = useState(true);
  const [muted, setMuted] = useState(true);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [reactionsSoloPitchId, setReactionsSoloPitchId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (resetScroll) {
      try {
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      router.replace("/", { scroll: false });
      return;
    }
    if (focusBattleId) return; // deep-link scroll-into-view below takes priority
    try {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved) el.scrollTop = Number(saved);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally once, on mount
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(SCROLL_STORAGE_KEY, String(el!.scrollTop));
        } catch {
          /* ignore */
        }
        queued = false;
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const loadTab = useCallback(async (nextTab: Tab) => {
    setLoading(true);
    setRequiresLogin(false);
    try {
      const res = await fetch(`/api/feed?tab=${nextTab}&offset=0&reactions=1`);
      const data: { items: FeedItemWithReactions[]; total: number; followsAnyone?: boolean; requiresLogin?: boolean } = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setRequiresLogin(Boolean(data.requiresLogin));
      setFollowsAnyone(data.followsAnyone ?? true);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleTabChange(nextTab: Tab) {
    if (nextTab === tab) return;
    setTab(nextTab);
    loadTab(nextTab);
  }

  // Phase 35: "Feed" tab tapped again while already on the feed —
  // bottom-nav.tsx dispatches this since a same-route Link click is
  // otherwise a no-op. Jump to the newest videos, same as every other
  // short-video app's own tab.
  useEffect(() => {
    function onFeedTabClicked() {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      try {
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      loadTab(tab);
    }
    window.addEventListener("markitch:feed-tab-clicked", onFeedTabClicked);
    return () => window.removeEventListener("markitch:feed-tab-clicked", onFeedTabClicked);
  }, [tab, loadTab]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || items.length >= total) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?tab=${tab}&offset=${items.length}&reactions=1`);
      const data: { items: FeedItemWithReactions[]; total: number } = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.key));
        return [...prev, ...data.items.filter((i) => !seen.has(i.key))];
      });
      setTotal(data.total);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [tab, items.length, total]);

  // Phase 10: deep-link from a notification/reminder — land straight on
  // that Pitch's card instead of the top of the ranked feed. Runs once;
  // page.tsx already guaranteed the card is in `initialItems`.
  useEffect(() => {
    if (!focusBattleId) return;
    const target =
      document.querySelector(`[data-battle-id="${focusBattleId}"]`) ??
      document.querySelector(`[data-solo-pitch-id="${focusBattleId}"]`);
    target?.scrollIntoView({ behavior: "auto", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally once, on mount
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200% 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // A card reports itself active once it's actually the one on screen
  // (same >=60% threshold each card already uses for autoplay) — that
  // recenters the mounted window, it never needs to know about leaving.
  const handleActive = useCallback(
    (key: string) => {
      setActiveIndex((prev) => {
        const idx = items.findIndex((i) => i.key === key);
        return idx === -1 ? prev : idx;
      });
    },
    [items],
  );

  function patchDuel(key: string, patch: Partial<FeedDuel>) {
    setItems((prev) => prev.map((item) => (item.kind === "duel" && item.key === key ? { ...item, ...patch } : item)));
  }

  function patchSide(key: string, sideIndex: 0 | 1, patch: Partial<FeedDuel["sides"][number]>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.kind !== "duel" || item.key !== key) return item;
        const sides = [...item.sides] as FeedDuel["sides"];
        sides[sideIndex] = { ...sides[sideIndex], ...patch };
        return { ...item, sides };
      }),
    );
  }

  function patchSolo(soloPitchId: string, patch: Partial<FeedSoloPitch>) {
    setItems((prev) =>
      prev.map((item) => (item.kind === "solo" && item.soloPitchId === soloPitchId ? { ...item, ...patch } : item)),
    );
  }

  async function handleToggleLike(duel: FeedDuel, sideIndex: 0 | 1) {
    const side = duel.sides[sideIndex];
    // Optimistic update — a heart-tap should feel instant.
    patchSide(duel.key, sideIndex, { viewerLiked: !side.viewerLiked, likeCount: side.likeCount + (side.viewerLiked ? -1 : 1) });
    try {
      const res = await fetch("/api/feed/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: duel.battleId, brandId: side.brandId }),
      });
      const data = await res.json();
      if (res.ok) {
        patchSide(duel.key, sideIndex, { viewerLiked: data.liked, likeCount: data.count });
      } else {
        // Roll back on failure (e.g. session expired mid-scroll).
        patchSide(duel.key, sideIndex, { viewerLiked: side.viewerLiked, likeCount: side.likeCount });
      }
    } catch {
      patchSide(duel.key, sideIndex, { viewerLiked: side.viewerLiked, likeCount: side.likeCount });
    }
  }

  async function handleVote(duel: FeedDuel, sideIndex: 0 | 1) {
    const side = duel.sides[sideIndex];
    try {
      const res = await fetch("/api/feed/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: duel.battleId, votedForBrandId: side.brandId }),
      });
      const data = await res.json();
      if (res.ok && data.tally) {
        patchDuel(duel.key, { tally: data.tally, viewerVotedBrandId: data.votedForBrandId });
        maybeOfferPushPrompt();
      }
    } catch {
      // Silent — the button just stays clickable, no state changed.
    }
  }

  // Phase 12d: no custom "möchtest du Benachrichtigungen?" question of our
  // own — the point of push is that voting is the only thing a viewer has
  // to do, the result finds them. We go straight for subscribeToPush(),
  // which itself triggers the browser's own native permission dialog; that
  // one dialog is unavoidable (no site can silently enable push — it's a
  // hard browser security boundary, not a product choice), but it's the
  // *only* prompt now, fired the moment it's obviously relevant: right
  // after a viewer's first vote. `mm_push_prompted` (localStorage) makes
  // this a one-time attempt even across sessions, whatever the browser's
  // dialog resolves to.
  function maybeOfferPushPrompt() {
    if (getNotificationPermission() !== "default") return; // already decided (granted/denied) or unsupported — nothing to do
    try {
      if (localStorage.getItem("mm_push_prompted")) return;
      localStorage.setItem("mm_push_prompted", "1");
    } catch {
      return; // can't remember the attempt reliably — safer to just not ask
    }
    void subscribeToPush();
  }

  function shareUrl(url: string, title: string) {
    const shareData = { title, url };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  function handleShare(duel: FeedDuel) {
    // Phase 17: /battles/[id] is the canonical share link now — it carries
    // a proper preview card (opengraph-image.tsx) for chat apps/socials,
    // and bounces a human visitor onward to wherever the Duell actually
    // lives (feed or waiting room) if it isn't a finished result.
    shareUrl(
      `${window.location.origin}/battles/${duel.battleId}?ref=battle:${duel.battleId}`,
      t(`${duel.sides[0].brandName} vs. ${duel.sides[1].brandName} auf MarkItch`, `${duel.sides[0].brandName} vs. ${duel.sides[1].brandName} on MarkItch`),
    );
  }

  function handleShareSolo(pitch: FeedSoloPitch) {
    shareUrl(
      `${window.location.origin}/?pitch=${pitch.soloPitchId}&ref=solo:${pitch.soloPitchId}`,
      t(`${pitch.brandName} auf MarkItch`, `${pitch.brandName} on MarkItch`),
    );
  }

  async function handleToggleLikeSolo(pitch: FeedSoloPitch) {
    patchSolo(pitch.soloPitchId, { viewerLiked: !pitch.viewerLiked, likeCount: pitch.likeCount + (pitch.viewerLiked ? -1 : 1) });
    try {
      const res = await fetch("/api/pitches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soloPitchId: pitch.soloPitchId }),
      });
      const data = await res.json();
      if (res.ok) {
        patchSolo(pitch.soloPitchId, { viewerLiked: data.liked, likeCount: data.count });
      } else {
        patchSolo(pitch.soloPitchId, { viewerLiked: pitch.viewerLiked, likeCount: pitch.likeCount });
      }
    } catch {
      patchSolo(pitch.soloPitchId, { viewerLiked: pitch.viewerLiked, likeCount: pitch.likeCount });
    }
  }

  // Luca 05.11.: Community-Reaktionen im Feed (wie in der App).
  function patchReaction(reactionId: string, patch: Partial<FeedReaction>) {
    setItems((prev) =>
      prev.map((item) => (item.kind === "reaction" && item.reactionId === reactionId ? { ...item, ...patch } : item)),
    );
  }

  async function handleToggleLikeReaction(item: FeedReaction) {
    patchReaction(item.reactionId, { viewerLiked: !item.viewerLiked, likeCount: item.likeCount + (item.viewerLiked ? -1 : 1) });
    try {
      const res = await fetch("/api/pitches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionId: item.reactionId }),
      });
      const data = await res.json();
      if (res.ok) patchReaction(item.reactionId, { viewerLiked: data.liked, likeCount: data.count });
      else patchReaction(item.reactionId, { viewerLiked: item.viewerLiked, likeCount: item.likeCount });
    } catch {
      patchReaction(item.reactionId, { viewerLiked: item.viewerLiked, likeCount: item.likeCount });
    }
  }

  function handleShareReaction(item: FeedReaction) {
    const path = item.soloPitchId ? `/?pitch=${item.soloPitchId}` : `/challenges/${item.creatorChallengeId}`;
    const sep = path.includes("?") ? "&" : "?";
    shareUrl(`${window.location.origin}${path}${sep}ref=reaction:${item.reactionId}`, t(`${item.authorName} auf MarkItch`, `${item.authorName} on MarkItch`));
  }

  function handleCommentPosted(id: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.kind === "reaction" && item.reactionId === id) return { ...item, commentCount: item.commentCount + 1 };
        if (item.kind === "duel" && item.battleId === id) return { ...item, commentCount: item.commentCount + 1 };
        if (item.kind === "solo" && item.soloPitchId === id) return { ...item, commentCount: item.commentCount + 1 };
        return item;
      }),
    );
  }

  function handleReactionCountChange(soloPitchId: string, count: number) {
    patchSolo(soloPitchId, { reactionCount: count });
  }

  function handleSoloPitchDeleted(soloPitchId: string) {
    setItems((prev) => prev.filter((item) => !(item.kind === "solo" && item.soloPitchId === soloPitchId)));
  }

  const showEmptyFollowing = tab === "following" && !loading && items.length === 0;

  return (
    // Phase 30: capped to a phone-shaped column and centered — Luca's report
    // that a video looks "extrem in die Breite gezogen" on a laptop: a 9:16
    // video with object-cover inside a full-viewport-width box gets
    // aggressively cropped on a wide, short window. Below this width
    // (any real phone) it's a no-op, full bleed as before.
    <div className="relative mx-auto h-[calc(100dvh-var(--bottom-nav-h))] w-full max-w-[480px] overflow-hidden bg-black md:border-x md:border-zinc-900">
      {/* Tabs — Luca 13.11.: bei „Bildschirm frei“ (Auge) ausgeblendet. */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center gap-6 pt-[calc(env(safe-area-inset-top)+14px)] ${cleanScreen ? "hidden" : ""}`}>
        {(
          [
            ["foryou", "Feed"],
            ["following", t("Folge ich", "Following")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`pointer-events-auto text-sm font-semibold drop-shadow ${
              tab === key ? "text-white" : "text-white/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="h-full w-full snap-y snap-mandatory overflow-y-scroll">
        {items.map((item, index) => {
          if (Math.abs(index - activeIndex) > FEED_WINDOW) {
            // Out of the mounted window — same height/snap behavior, no video.
            return (
              <div
                key={item.key}
                className="relative h-[calc(100dvh-var(--bottom-nav-h))] w-full snap-start snap-always bg-black"
              />
            );
          }
          if (item.kind === "reaction") {
            return (
              <FeedCommunityCard
                key={item.key}
                item={item}
                isLoggedIn={isLoggedIn}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
                onToggleLike={handleToggleLikeReaction}
                onOpenComments={(reactionId) => setCommentTarget({ kind: "reaction", id: reactionId })}
                onShare={handleShareReaction}
                onActive={() => handleActive(item.key)}
              />
            );
          }
          return item.kind === "duel" ? (
            <FeedDuelCard
              key={item.key}
              duel={item}
              isLoggedIn={isLoggedIn}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleLike={handleToggleLike}
              onVote={handleVote}
              onOpenComments={(battleId) => setCommentTarget({ kind: "battle", id: battleId })}
              onShare={handleShare}
              onActive={() => handleActive(item.key)}
            />
          ) : (
            <FeedSoloPitchCard
              key={item.key}
              pitch={item}
              isLoggedIn={isLoggedIn}
              viewerHasOtherBrand={Boolean(viewerBrandId && viewerBrandId !== item.brandId)}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleLike={handleToggleLikeSolo}
              onOpenComments={(soloPitchId) => setCommentTarget({ kind: "solo", id: soloPitchId })}
              onOpenReactions={setReactionsSoloPitchId}
              onShare={handleShareSolo}
              onUpdated={(patch) => patchSolo(item.soloPitchId, patch)}
              onDeleted={() => handleSoloPitchDeleted(item.soloPitchId)}
              onActive={() => handleActive(item.key)}
            />
          );
        })}
        <div ref={sentinelRef} className="h-1 w-full" />

        {items.length === 0 && !loading && !showEmptyFollowing && (
          <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center">
            <p className="text-lg font-semibold text-white">{t("Noch keine Pitches", "No pitches yet")}</p>
            <p className="mt-2 text-sm text-zinc-400">
              {t("Sobald jemand einen Solo-Pitch postet oder ein Duell live geht, taucht es hier auf.", "As soon as someone posts a solo pitch or a duel goes live, it shows up here.")}
            </p>
          </div>
        )}

        {showEmptyFollowing && (
          <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center">
            <p className="text-lg font-semibold text-white">
              {requiresLogin ? t("Melde dich an", "Log in") : followsAnyone ? t("Noch nichts Neues", "Nothing new yet") : t("Folge ein paar Marken", "Follow a few brands")}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {requiresLogin
                ? t("Melde dich an, um zu sehen, wenn Marken, denen du folgst, einen neuen Pitch posten.", "Log in to see when brands you follow post a new pitch.")
                : followsAnyone
                  ? t("Die Marken, denen du folgst, haben noch nichts gepostet.", "The brands you follow haven’t posted anything yet.")
                  : t("Sobald du Marken folgst, siehst du hier ihre neuesten Pitches zuerst.", "Once you follow brands, you’ll see their latest pitches here first.")}
            </p>
            {(requiresLogin || !followsAnyone) && (
              <a
                href={requiresLogin ? "/login" : "/brands"}
                className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
              >
                {requiresLogin ? t("Anmelden", "Log in") : t("Marken entdecken", "Discover brands")}
              </a>
            )}
          </div>
        )}
      </div>

      {commentTarget && (
        <CommentSheet
          target={commentTarget}
          isLoggedIn={isLoggedIn}
          onClose={() => setCommentTarget(null)}
          onCommentPosted={handleCommentPosted}
        />
      )}

      {reactionsSoloPitchId &&
        (() => {
          const pitch = items.find((i) => i.kind === "solo" && i.soloPitchId === reactionsSoloPitchId) as
            | FeedSoloPitch
            | undefined;
          return (
            <ReactionsOverlay
              soloPitchId={reactionsSoloPitchId}
              isLoggedIn={isLoggedIn}
              canPostReaction={Boolean(viewerBrandId && pitch && viewerBrandId !== pitch.brandId)}
              canPromote={Boolean(viewerBrandId && pitch && viewerBrandId === pitch.brandId)}
              viewerBrandId={viewerBrandId}
              onClose={() => setReactionsSoloPitchId(null)}
              onReactionCountChange={handleReactionCountChange}
            />
          );
        })()}
    </div>
  );
}
