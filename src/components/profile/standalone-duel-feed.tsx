"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { FeedDuelCard } from "@/components/feed/feed-duel-card";
import { CommentSheet, type CommentTarget } from "@/components/feed/comment-sheet";
import { BottomNav } from "@/components/nav/bottom-nav";
import type { FeedDuel } from "@/lib/feed";
import { useT } from "@/components/i18n/lang-provider";

// Phase 44: same fix as StandaloneSoloPitchFeed — this overlay mounted
// every duel in the list at once, unbounded, and a duel card mounts *two*
// videos (both sides). That's exactly what got the app OS-killed for
// memory during Luca's testing. Only mount cards within this many
// positions of the active one.
const WINDOW = 2;

/**
 * Phase 40: opened from a profile grid tile's "Duelle" tab — Luca: clicking
 * a tile there jumped into the *global* feed (`/?battle=<id>`) instead of
 * staying on this profile; "man soll in Duelle im Profil bleiben und nur
 * diese Videos scrollen." Same idea as StandaloneSoloPitchView (reuses the
 * real FeedDuelCard, full like/vote/comment/share — "Ansicht soll schon
 * die selbe sein wie im Feed"), but as its own scrollable stack limited to
 * this one brand's duels instead of a single static post.
 */
export function StandaloneDuelFeed({
  duels: initialDuels,
  startIndex,
  isLoggedIn,
  onClose,
}: {
  duels: FeedDuel[];
  startIndex: number;
  isLoggedIn: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [duels, setDuels] = useState(initialDuels);
  const [muted, setMuted] = useState(true);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && startIndex > 0) el.scrollTop = startIndex * el.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActive = useCallback(
    (key: string) => {
      setActiveIndex((prev) => {
        const idx = duels.findIndex((d) => d.key === key);
        return idx === -1 ? prev : idx;
      });
    },
    [duels],
  );

  function patchDuel(key: string, patch: Partial<FeedDuel>) {
    setDuels((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function patchSide(key: string, sideIndex: 0 | 1, patch: Partial<FeedDuel["sides"][number]>) {
    setDuels((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        const sides = [...d.sides] as FeedDuel["sides"];
        sides[sideIndex] = { ...sides[sideIndex], ...patch };
        return { ...d, sides };
      }),
    );
  }

  async function handleToggleLike(duel: FeedDuel, sideIndex: 0 | 1) {
    const side = duel.sides[sideIndex];
    patchSide(duel.key, sideIndex, { viewerLiked: !side.viewerLiked, likeCount: side.likeCount + (side.viewerLiked ? -1 : 1) });
    try {
      const res = await fetch("/api/feed/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: duel.battleId, brandId: side.brandId }),
      });
      const data = await res.json();
      if (res.ok) patchSide(duel.key, sideIndex, { viewerLiked: data.liked, likeCount: data.count });
      else patchSide(duel.key, sideIndex, { viewerLiked: side.viewerLiked, likeCount: side.likeCount });
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
      if (res.ok && data.tally) patchDuel(duel.key, { tally: data.tally, viewerVotedBrandId: data.votedForBrandId });
    } catch {
      // Silent — the button just stays clickable, no state changed.
    }
  }

  function handleShare(duel: FeedDuel) {
    const url = `${window.location.origin}/battles/${duel.battleId}`;
    const shareData = { title: t(`${duel.sides[0].brandName} vs. ${duel.sides[1].brandName} auf MarkItch`, `${duel.sides[0].brandName} vs. ${duel.sides[1].brandName} on MarkItch`), url };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <button
        onClick={onClose}
        aria-label={t("Schließen", "Close")}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <X size={18} />
      </button>

      <div ref={scrollRef} className="h-[calc(100dvh-var(--bottom-nav-h))] w-full snap-y snap-mandatory overflow-y-scroll overflow-x-hidden">
        {duels.map((duel, index) => {
          if (Math.abs(index - activeIndex) > WINDOW) {
            return (
              <div
                key={duel.key}
                className="relative h-[calc(100dvh-var(--bottom-nav-h))] w-full snap-start snap-always bg-black"
              />
            );
          }
          return (
            <FeedDuelCard
              key={duel.key}
              duel={duel}
              isLoggedIn={isLoggedIn}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleLike={handleToggleLike}
              onVote={handleVote}
              onOpenComments={(battleId) => setCommentTarget({ kind: "battle", id: battleId })}
              onShare={handleShare}
              onActive={() => handleActive(duel.key)}
            />
          );
        })}
      </div>

      {commentTarget && (
        <CommentSheet
          target={commentTarget}
          isLoggedIn={isLoggedIn}
          onClose={() => setCommentTarget(null)}
          onCommentPosted={() =>
            setDuels((prev) => prev.map((d) => (d.battleId === commentTarget.id ? { ...d, commentCount: d.commentCount + 1 } : d)))
          }
        />
      )}

      {/* Phase 41: same fix as StandaloneSoloPitchView — this overlay's own
          bg-black sat visually on top of the root layout's BottomNav even
          though it was still mounted underneath. */}
      <BottomNav isLoggedIn={isLoggedIn} />
    </div>
  );
}
