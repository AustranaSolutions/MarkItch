"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { FeedSoloPitchCard } from "@/components/feed/feed-solo-pitch-card";
import { CommentSheet, type CommentTarget } from "@/components/feed/comment-sheet";
import { ReactionsOverlay } from "@/components/pitches/reactions-overlay";
import { BottomNav } from "@/components/nav/bottom-nav";
import type { FeedSoloPitch } from "@/lib/feed";
import { useT } from "@/components/i18n/lang-provider";

// Phase 44: this overlay mounted every single video in the list at once,
// unbounded — the exact same "OS kills the app for memory" bug already
// fixed in the main FeedClient (Phase 43), just never carried over here.
// A brand with many videos + this being reachable straight from a profile
// grid tile made it an easy way to reproduce that crash again. Same fix:
// only mount cards within this many positions of the active one.
const WINDOW = 2;

/**
 * Phase 43: opened from a profile grid tile's "Videos" tab — Luca: tapping
 * a tile there only ever showed that *one* video with no way to swipe on
 * to the brand's other posts ("kann nicht swipen sondern nur dieses eine
 * Video schauen"). The Duelle tab already got this exact treatment in
 * Phase 40 (see StandaloneDuelFeed) — same idea here: a real scrollable
 * stack of this brand's solo pitches, landing on the tapped one, instead
 * of a single static post with a dead end but the close button.
 */
export function StandaloneSoloPitchFeed({
  pitches: initialPitches,
  startIndex,
  isLoggedIn,
  viewerBrandId,
  onClose,
  onPitchUpdated,
  onPitchDeleted,
}: {
  pitches: FeedSoloPitch[];
  startIndex: number;
  isLoggedIn: boolean;
  viewerBrandId?: string | null;
  onClose: () => void;
  /** Keeps the grid tile behind this overlay in sync with an edit/delete made from inside it. */
  onPitchUpdated?: (soloPitchId: string, patch: Partial<FeedSoloPitch>) => void;
  onPitchDeleted?: (soloPitchId: string) => void;
}) {
  const t = useT();
  const [pitches, setPitches] = useState(initialPitches);
  const [muted, setMuted] = useState(true);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [reactionsSoloPitchId, setReactionsSoloPitchId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && startIndex > 0) el.scrollTop = startIndex * el.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActive = useCallback(
    (soloPitchId: string) => {
      setActiveIndex((prev) => {
        const idx = pitches.findIndex((p) => p.soloPitchId === soloPitchId);
        return idx === -1 ? prev : idx;
      });
    },
    [pitches],
  );

  function patch(soloPitchId: string, p: Partial<FeedSoloPitch>) {
    setPitches((prev) => prev.map((x) => (x.soloPitchId === soloPitchId ? { ...x, ...p } : x)));
  }

  async function handleToggleLike(pitch: FeedSoloPitch) {
    patch(pitch.soloPitchId, { viewerLiked: !pitch.viewerLiked, likeCount: pitch.likeCount + (pitch.viewerLiked ? -1 : 1) });
    try {
      const res = await fetch("/api/pitches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soloPitchId: pitch.soloPitchId }),
      });
      const data = await res.json();
      if (res.ok) patch(pitch.soloPitchId, { viewerLiked: data.liked, likeCount: data.count });
      else patch(pitch.soloPitchId, { viewerLiked: pitch.viewerLiked, likeCount: pitch.likeCount });
    } catch {
      patch(pitch.soloPitchId, { viewerLiked: pitch.viewerLiked, likeCount: pitch.likeCount });
    }
  }

  function handleShare(pitch: FeedSoloPitch) {
    const url = `${window.location.origin}/?pitch=${pitch.soloPitchId}`;
    const shareData = { title: t(`${pitch.brandName} auf MarkItch`, `${pitch.brandName} on MarkItch`), url };
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

      <div ref={scrollRef} className="h-[calc(100dvh-var(--bottom-nav-h))] w-full snap-y snap-mandatory overflow-y-scroll">
        {pitches.map((pitch, index) => {
          if (Math.abs(index - activeIndex) > WINDOW) {
            return (
              <div
                key={pitch.soloPitchId}
                className="relative h-[calc(100dvh-var(--bottom-nav-h))] w-full snap-start snap-always bg-black"
              />
            );
          }
          return (
            <FeedSoloPitchCard
              key={pitch.soloPitchId}
              pitch={pitch}
              isLoggedIn={isLoggedIn}
              viewerHasOtherBrand={Boolean(viewerBrandId && viewerBrandId !== pitch.brandId)}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleLike={handleToggleLike}
              onOpenComments={(soloPitchId) => setCommentTarget({ kind: "solo", id: soloPitchId })}
              onOpenReactions={setReactionsSoloPitchId}
              onShare={handleShare}
              onUpdated={(p) => {
                patch(pitch.soloPitchId, p);
                onPitchUpdated?.(pitch.soloPitchId, p);
              }}
              onDeleted={() => {
                setPitches((prev) => prev.filter((p) => p.soloPitchId !== pitch.soloPitchId));
                onPitchDeleted?.(pitch.soloPitchId);
              }}
              onActive={() => handleActive(pitch.soloPitchId)}
            />
          );
        })}
      </div>

      {commentTarget && (
        <CommentSheet
          target={commentTarget}
          isLoggedIn={isLoggedIn}
          onClose={() => setCommentTarget(null)}
          onCommentPosted={(id) => patch(id, { commentCount: (pitches.find((p) => p.soloPitchId === id)?.commentCount ?? 0) + 1 })}
        />
      )}

      {reactionsSoloPitchId &&
        (() => {
          const pitch = pitches.find((p) => p.soloPitchId === reactionsSoloPitchId);
          return (
            <ReactionsOverlay
              soloPitchId={reactionsSoloPitchId}
              isLoggedIn={isLoggedIn}
              canPostReaction={Boolean(viewerBrandId && pitch && viewerBrandId !== pitch.brandId)}
              canPromote={Boolean(viewerBrandId && pitch && viewerBrandId === pitch.brandId)}
              viewerBrandId={viewerBrandId}
              onClose={() => setReactionsSoloPitchId(null)}
              onReactionCountChange={(id, count) => patch(id, { reactionCount: count })}
            />
          );
        })()}

      {/* Same fix as StandaloneDuelFeed — this overlay's own bg-black sat
          visually on top of the root layout's BottomNav even though it was
          still mounted underneath. */}
      <BottomNav isLoggedIn={isLoggedIn} />
    </div>
  );
}
