"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Heart, MessageCircle, Repeat2, Rocket, Share2, Play, Volume2, VolumeX, X } from "lucide-react";
import { FollowButton } from "@/components/brand/follow-button";
import { PitchChallengeButton } from "@/components/pitches/pitch-challenge-button";
import { BoostButton } from "@/components/pitches/boost-button";
import { ReportButton } from "@/components/moderation/report-button";
import { SoloPitchOwnerMenuButton } from "@/components/pitches/solo-pitch-owner-menu-button";
import { AdLabel, AiContentLabel } from "@/components/ui";
import type { FeedSoloPitch } from "@/lib/feed";
import { trackAnalyticsEvent } from "@/lib/analytics-client";
import { BOOST_ENABLED } from "@/lib/feature-flags";

export function FeedSoloPitchCard({
  pitch,
  isLoggedIn,
  viewerHasOtherBrand,
  muted,
  onToggleMute,
  onToggleLike,
  onOpenComments,
  onOpenReactions,
  onShare,
  onClose,
  onUpdated,
  onDeleted,
  onActive,
}: {
  pitch: FeedSoloPitch;
  isLoggedIn: boolean;
  /** Viewer owns a brand, and it isn't this pitch's own — gate for "Pitch schicken". */
  viewerHasOtherBrand: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (pitch: FeedSoloPitch) => void;
  onOpenComments: (soloPitchId: string) => void;
  onOpenReactions: (soloPitchId: string) => void;
  onShare: (pitch: FeedSoloPitch) => void;
  /** Phase 32: only passed when this card is shown standalone (profile grid's single-post view) — renders a close "✕" instead of living inline in a scroll list. */
  onClose?: () => void;
  /** Phase 32: owner-only edit (via the "⋮" menu) needs to patch the card's data in whatever list/state renders it. */
  onUpdated?: (patch: Partial<FeedSoloPitch>) => void;
  onDeleted?: () => void;
  /** Phase 43: tells FeedClient this card is the one on screen now, so it can keep only nearby cards' videos mounted. */
  onActive?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [shareLabel, setShareLabel] = useState<string | null>(null);
  const trackedView = useRef(false);
  // Phase 32: tap now pauses/resumes (Luca: "wie bei Insta") instead of
  // toggling mute — mute moved into this same pause overlay as a smaller,
  // secondary button, replacing the old always-visible top-right icon.
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [showLikePop, setShowLikePop] = useState(false);
  const lastTapAt = useRef(0);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase 48: siehe feed-duel-card.tsx — derselbe "Screen leer machen"-Knopf.
  const [uiHidden, setUiHidden] = useState(false);

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
    if (!inView || trackedView.current) return;
    trackedView.current = true;
    trackAnalyticsEvent(pitch.brandId, "view", { soloPitchId: pitch.soloPitchId });
  }, [inView, pitch.brandId, pitch.soloPitchId]);

  useEffect(() => {
    if (inView) onActive?.();
  }, [inView, onActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (inView && !manuallyPaused) video.play().catch(() => {});
    else video.pause();
  }, [inView, muted, manuallyPaused]);

  function handleShare() {
    onShare(pitch);
    trackAnalyticsEvent(pitch.brandId, "share");
    setShareLabel("Link kopiert!");
    setTimeout(() => setShareLabel(null), 1800);
  }

  // Phase 43: the pause toggle used to fire on every single tap immediately,
  // including the *first* tap of an intended double-tap — Luca: man will
  // liken, aber genau zwischen dem Doppeltipp pausiert er kurz und setzt
  // dann fort. TikTok/Instagram wait out the double-tap window before
  // committing to a plain pause; a first tap now only schedules the pause,
  // and a second tap within the window cancels it and likes instead (never
  // unlikes, matching Instagram).
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
      if (!pitch.viewerLiked) onToggleLike(pitch);
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
    <div
      ref={containerRef}
      data-solo-pitch-id={pitch.soloPitchId}
      className="relative h-[calc(100dvh-var(--bottom-nav-h))] w-full snap-start snap-always bg-black"
    >
      <video
        ref={videoRef}
        src={pitch.videoUrl}
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

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
        >
          <X size={18} />
        </button>
      )}

      {!uiHidden && (
        <div
          className="pointer-events-none absolute left-2 flex flex-col items-start gap-1"
          style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
        >
          <AdLabel />
          {pitch.containsAiContent && <AiContentLabel />}
        </div>
      )}

      {/* Phase 48: oben links, unter dem Anzeige/KI-Badge (siehe
          feed-duel-card.tsx für die volle Begründung gegen die anderen drei
          Ecken: oben rechts drängen sich Glocke/Schließen-Button, unten
          links/rechts sind Info-Text bzw. Action-Leiste belegt). */}
      <button
        onClick={() => setUiHidden((h) => !h)}
        aria-label={uiHidden ? "Bedienelemente einblenden" : "Bedienelemente ausblenden"}
        className="pointer-events-auto absolute left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/70"
        style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}
      >
        {uiHidden ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>

      {!uiHidden && (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-4 pr-20">
        <div className="pointer-events-auto mb-2 flex items-center gap-2">
          <Link href={`/brands/${pitch.brandSlug}`} className="text-sm font-bold text-white hover:underline">
            {pitch.brandName}
          </Link>
          {!pitch.viewerOwnsThisBrand && isLoggedIn && (
            <FollowButton brandId={pitch.brandId} isFollowing={pitch.viewerFollowsBrand} />
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400">
            <Eye size={11} /> {pitch.viewCount}
          </span>
          {pitch.boosted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">
              <Rocket size={11} /> Boost
            </span>
          )}
        </div>
        {pitch.description && <p className="mb-2 text-sm text-white/90">{pitch.description}</p>}
        {pitch.ctaUrl && pitch.ctaLabel && (
          <a
            href={pitch.ctaUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => trackAnalyticsEvent(pitch.brandId, "cta_click", { soloPitchId: pitch.soloPitchId })}
            className="pointer-events-auto mb-2 inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-500"
          >
            {pitch.ctaLabel} →
          </a>
        )}
        <div className="pointer-events-auto inline-block">
          {viewerHasOtherBrand && <PitchChallengeButton soloPitchId={pitch.soloPitchId} />}
          {BOOST_ENABLED && pitch.viewerOwnsThisBrand && <BoostButton soloPitchId={pitch.soloPitchId} />}
        </div>
      </div>
      )}

      {/* Right action rail — pointer-events-none on the wrapper, auto only
          on each button, so a swipe/tap near this edge (or a double-tap
          slightly off-center) still reaches the gesture layer instead of
          being swallowed by empty space between icons. */}
      {!uiHidden && (
      <div className="pointer-events-none absolute bottom-4 right-3 flex flex-col items-center gap-5">
        <button
          onClick={() => (isLoggedIn ? onToggleLike(pitch) : (window.location.href = "/login"))}
          className="pointer-events-auto flex flex-col items-center gap-1 text-white"
          aria-label="Like"
        >
          <Heart size={30} className={pitch.viewerLiked ? "fill-red-500 text-red-500" : ""} />
          <span className="text-xs font-medium">{pitch.likeCount}</span>
        </button>

        <button onClick={() => onOpenComments(pitch.soloPitchId)} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <MessageCircle size={28} />
          <span className="text-xs font-medium">{pitch.commentCount}</span>
        </button>

        <button onClick={() => onOpenReactions(pitch.soloPitchId)} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <Repeat2 size={28} />
          <span className="text-xs font-medium">{pitch.reactionCount}</span>
        </button>

        <button onClick={handleShare} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <Share2 size={26} />
          <span className="text-xs font-medium">{shareLabel ? "Kopiert" : "Teilen"}</span>
        </button>

        {pitch.viewerOwnsThisBrand ? (
          <SoloPitchOwnerMenuButton
            pitch={pitch}
            onUpdated={(patch) => onUpdated?.(patch)}
            onDeleted={() => onDeleted?.()}
          />
        ) : (
          <ReportButton targetType="solo_pitch" targetId={pitch.soloPitchId} isLoggedIn={isLoggedIn} />
        )}
      </div>
      )}
    </div>
  );
}
