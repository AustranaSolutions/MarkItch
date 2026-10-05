"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, MessageSquareShare, Play, Share2, Volume2, VolumeX } from "lucide-react";
import { PromoteReactionButton } from "@/components/pitches/promote-reaction-button";
import { ReportButton } from "@/components/moderation/report-button";
import { AdLabel, AiContentLabel } from "@/components/ui";
import type { ReactionRow } from "@/lib/reaction-threads";

/**
 * Phase 34: one reaction, full-screen — same visual language as
 * FeedSoloPitchCard (tap to pause, mute only shown while paused) instead of
 * a cramped list-item video. Luca: "wie bei TikTok... man soll da auch
 * normal liken... können."
 *
 * Phase 40: `canReply` + `onReply` — a reaction can now itself be replied
 * to, chaining two brands back and forth ("Coke vs. Pepsi"). A reply shows
 * an "Antwort im Thread" badge instead of "Reaktion" so the chain reads
 * clearly while scrolling through it. Comments + Share were also added
 * here (previously the only card type without them) — Luca: "like/comment/
 * teilen/melden sollen überall gleich sein", same icon set/order as
 * FeedSoloPitchCard, with "Antworten" (the video-reply/chain action) as
 * the one addition unique to reactions.
 */
export function ReactionFeedCard({
  reaction,
  isLoggedIn,
  canPromote,
  canReply,
  muted,
  onToggleMute,
  onToggleLike,
  onReply,
  onOpenComments,
  onShare,
  onActive,
}: {
  reaction: ReactionRow;
  isLoggedIn: boolean;
  canPromote: boolean;
  canReply: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (reactionId: string) => void;
  onReply: (reactionId: string) => void;
  onOpenComments: (reactionId: string) => void;
  onShare: (reaction: ReactionRow) => void;
  /** Tells ReactionsFeed this card is the one on screen now, so it can keep only nearby cards' videos mounted. */
  onActive?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [showLikePop, setShowLikePop] = useState(false);
  const lastTapAt = useRef(0);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting && entry.intersectionRatio >= 0.6);
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (inView && !manuallyPaused) video.play().catch(() => {});
    else video.pause();
  }, [inView, muted, manuallyPaused]);

  useEffect(() => {
    if (inView) onActive?.();
  }, [inView, onActive]);

  const DOUBLE_TAP_MS = 300;
  function handleTap() {
    const now = Date.now();
    if (now - lastTapAt.current < DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      if (pauseTimer.current) {
        clearTimeout(pauseTimer.current);
        pauseTimer.current = null;
      }
      if (!isLoggedIn) {
        window.location.href = "/login";
        return;
      }
      if (!reaction.viewerLiked) onToggleLike(reaction.id);
      setShowLikePop(true);
      setTimeout(() => setShowLikePop(false), 700);
    } else {
      lastTapAt.current = now;
      pauseTimer.current = setTimeout(() => {
        setManuallyPaused((p) => !p);
        pauseTimer.current = null;
      }, DOUBLE_TAP_MS);
    }
  }

  return (
    <div ref={containerRef} className="relative h-dvh w-full snap-start snap-always bg-black">
      <video
        ref={videoRef}
        src={reaction.videoUrl}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0" onClick={handleTap} />

      {showLikePop && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart size={96} className="fill-white text-white drop-shadow-lg" style={{ animation: "like-pop 0.7s ease-out" }} />
        </div>
      )}

      {manuallyPaused && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
            <Play size={28} fill="currentColor" />
          </span>
          <button
            onClick={onToggleMute}
            aria-label={muted ? "Ton an" : "Ton aus"}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-24 pr-20">
        <div className="pointer-events-auto mb-2 flex items-center gap-2">
          {reaction.brand ? (
            <Link href={`/brands/${reaction.brand.slug}`} className="text-sm font-bold text-white hover:underline">
              {reaction.brand.name}
            </Link>
          ) : (
            <span className="text-sm font-bold text-white">{reaction.community?.name}</span>
          )}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
            {reaction.parentReactionId ? "Antwort im Thread" : "Reaktion"}
          </span>
          {reaction.brand ? (
            <AdLabel />
          ) : (
            <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">Community</span>
          )}
          {reaction.containsAiContent && <AiContentLabel />}
        </div>
        {reaction.promotedToBattleId && (
          <Link href={`/pitches/${reaction.promotedToBattleId}`} className="pointer-events-auto text-sm text-orange-400 hover:underline">
            Duell ansehen →
          </Link>
        )}
        {canPromote && !reaction.promotedToBattleId && (
          <div className="pointer-events-auto inline-block">
            <PromoteReactionButton reactionId={reaction.id} />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-40 right-3 flex flex-col items-center gap-5">
        <button
          onClick={() => (isLoggedIn ? onToggleLike(reaction.id) : (window.location.href = "/login"))}
          className="pointer-events-auto flex flex-col items-center gap-1 text-white"
          aria-label="Like"
        >
          <Heart size={30} className={reaction.viewerLiked ? "fill-red-500 text-red-500" : ""} />
          <span className="text-xs font-medium">{reaction.likeCount}</span>
        </button>

        <button onClick={() => onOpenComments(reaction.id)} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <MessageCircle size={28} />
          <span className="text-xs font-medium">{reaction.commentCount}</span>
        </button>

        {canReply && (
          <button onClick={() => onReply(reaction.id)} className="pointer-events-auto flex flex-col items-center gap-1 text-white" aria-label="Antworten">
            <MessageSquareShare size={28} />
            <span className="text-xs font-medium">Antworten</span>
          </button>
        )}

        <button onClick={() => onShare(reaction)} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <Share2 size={26} />
          <span className="text-xs font-medium">Teilen</span>
        </button>

        <ReportButton targetType="reaction" targetId={reaction.id} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
