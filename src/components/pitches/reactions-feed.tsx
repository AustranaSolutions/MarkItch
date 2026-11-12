"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import type { ReactionRow } from "@/lib/reaction-threads";
import { ReactionFeedCard } from "@/components/pitches/reaction-feed-card";
import { useT } from "@/components/i18n/lang-provider";

// Phase 44: same fix as StandaloneSoloPitchFeed/StandaloneDuelFeed — every
// reaction in the list was mounted (and its video loaded) at once,
// unbounded, one of the few remaining sources of the "OS kills the app for
// memory" crash. Only mount cards within this many positions of the active one.
const WINDOW = 2;

/**
 * Phase 34: full-screen, scrollable feed of a solo pitch's reactions.
 *
 * Phase 40: purely presentational now — ReactionsOverlay owns fetching,
 * the grid landing screen, and the upload sheet. `reactions` is already the
 * flattened, thread-aware order from buildReactionThreads (a tapped
 * reaction immediately followed by its own reply chain), and `startIndex`
 * is where to land on mount so tapping a grid tile drops you exactly on
 * that reaction, not back at the very top of every reaction on the pitch.
 */
export function ReactionsFeed({
  reactions,
  isLoggedIn,
  canPromote,
  viewerBrandId,
  muted,
  onToggleMute,
  onToggleLike,
  onReply,
  onOpenComments,
  onShare,
  startIndex,
  onClose,
  onBackToGrid,
}: {
  reactions: ReactionRow[];
  isLoggedIn: boolean;
  canPromote: boolean;
  viewerBrandId?: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (reactionId: string) => void;
  onReply: (reactionId: string) => void;
  onOpenComments: (reactionId: string) => void;
  onShare: (reaction: ReactionRow) => void;
  startIndex: number;
  onClose: () => void;
  onBackToGrid: () => void;
}) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && startIndex > 0) el.scrollTop = startIndex * el.clientHeight;
    // Only ever jump on mount — a later re-render (e.g. after posting a
    // reply) shouldn't yank the viewer back to where they started.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActive = useCallback(
    (reactionId: string) => {
      setActiveIndex((prev) => {
        const idx = reactions.findIndex((r) => r.id === reactionId);
        return idx === -1 ? prev : idx;
      });
    },
    [reactions],
  );

  return (
    // z-[60]: sits above other fixed overlays (StandaloneSoloPitchView,
    // CommentSheet, etc. all use z-50) since this can be opened from within
    // the profile grid's own full-screen post view.
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        onClick={onBackToGrid}
        aria-label={t("Zurück zur Übersicht", "Back to overview")}
        className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={onClose}
        aria-label={t("Schließen", "Close")}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <X size={18} />
      </button>

      <div ref={scrollRef} className="h-dvh w-full snap-y snap-mandatory overflow-y-scroll">
        {reactions.map((r, index) => {
          if (Math.abs(index - activeIndex) > WINDOW) {
            return <div key={r.id} className="relative h-dvh w-full snap-start snap-always bg-black" />;
          }
          return (
            <ReactionFeedCard
              key={r.id}
              reaction={r}
              isLoggedIn={isLoggedIn}
              canPromote={canPromote && !r.parentReactionId}
              canReply={Boolean(viewerBrandId) && r.brandId !== viewerBrandId}
              muted={muted}
              onToggleMute={onToggleMute}
              onToggleLike={onToggleLike}
              onReply={onReply}
              onOpenComments={onOpenComments}
              onShare={onShare}
              onActive={() => handleActive(r.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
