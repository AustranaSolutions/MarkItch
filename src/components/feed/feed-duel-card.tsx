"use client";

import { toggleCleanScreen, useCleanScreen, useResetCleanScreenWhenActive } from "@/lib/clean-screen";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { RailFollowButton } from "@/components/brand/follow-button";
import { CtaLink } from "@/components/feed/cta-link";
import { ReportButton } from "@/components/moderation/report-button";
import { AdLabel, AiContentLabel } from "@/components/ui";
import type { FeedDuel } from "@/lib/feed";
import { trackAnalyticsEvent, VIEW_AFTER_MS } from "@/lib/analytics-client";
import { FastForwardBadge, isInEdgeZone, useEdgeFastForward } from "@/components/feed/edge-fast-forward";
import { SeekBar } from "@/components/feed/seek-bar";
import { useVideoTrim, useWatchedToEnd } from "@/lib/use-video-trim";
import { useVideoMusic } from "@/lib/use-video-music";
import { useT } from "@/components/i18n/lang-provider";
import { type Translate, langOf, socialCount, compactNumber, duelCategoryLabel } from "@/lib/i18n";
import { useGuestVote } from "@/lib/guest-votes-client";

// Phase 39: both sides of a duel are now always mounted side by side (the
// Phase 38 sliding carousel) instead of only the active one — the inactive
// side used to never exist in the DOM at all, so it never needed this.
// `preload="metadata"` alone only guarantees duration/dimensions, not an
// actually decoded/visible frame, in every browser — without this, the
// side you swipe *to* was still just solid black until it became active
// and started playing. Same trick as the profile grid thumbnails.
function showFirstFrame(video: HTMLVideoElement) {
  if (video.readyState >= 1) video.currentTime = 0.1;
  else video.addEventListener("loadedmetadata", () => (video.currentTime = 0.1), { once: true });
}

function timeLeftLabel(iso: string, t: Translate): string {
  const hoursLeft = Math.max(0, (new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000));
  if (hoursLeft >= 24) return t(`${Math.ceil(hoursLeft / 24)} Tage`, `${Math.ceil(hoursLeft / 24)} days`);
  return `${Math.max(1, Math.ceil(hoursLeft))}h`;
}

function outcomeLabel(sideIndex: 0 | 1, tally: FeedDuel["tally"], t: Translate): { label: string; won: boolean } | null {
  if (tally.total === 0) return null;
  if (tally.brandAVotes === tally.brandBVotes) return { label: t("Unentschieden", "Tie"), won: false };
  const won = (sideIndex === 0 && tally.brandAVotes > tally.brandBVotes) || (sideIndex === 1 && tally.brandBVotes > tally.brandAVotes);
  return { label: won ? t("Gewonnen", "Won") : t("Verloren", "Lost"), won };
}

/**
 * Luca 13.11. (2): aufgeräumt wie in der App — pro Zustand ein Element plus
 * höchstens eine kleine graue Zeile. Sieger in Gold, sonst ruhig.
 */
function ResultPill({ sideIndex, tally }: { sideIndex: 0 | 1; tally: FeedDuel["tally"] }) {
  const t = useT();
  const outcome = outcomeLabel(sideIndex, tally, t);
  if (!outcome) return null;
  const sideVotes = sideIndex === 0 ? tally.brandAVotes : tally.brandBVotes;
  const pct = Math.round((sideVotes / tally.total) * 100);
  if (outcome.won) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f5c542] px-2.5 py-0.5 text-xs font-bold text-[#2a1d00]">
        <Trophy size={12} /> {t(`Gewonnen · ${pct} %`, `Won · ${pct}%`)}
      </span>
    );
  }
  const tie = tally.brandAVotes === tally.brandBVotes;
  return <span className="text-xs text-zinc-300">{tie ? t(`Unentschieden · ${pct} %`, `Tie · ${pct}%`) : t(`Verloren · ${pct} %`, `Lost · ${pct}%`)}</span>;
}

function VoteState({
  duel,
  sideIndex,
  isLoggedIn,
  onVote,
  voting,
}: {
  duel: FeedDuel;
  sideIndex: 0 | 1;
  isLoggedIn: boolean;
  onVote: () => void;
  voting: boolean;
}) {
  const t = useT();
  const { tally, officialTally, isFinished, viewerOwnsThisBattle, votingEndsAt } = duel;
  // Luca 13.11. (Phase 5): ohne Konto zählt die im Browser gemerkte Gast-Stimme.
  const guestVote = useGuestVote(duel.battleId);
  const viewerVotedBrandId = duel.viewerVotedBrandId ?? (isLoggedIn ? null : guestVote);
  const votedAsGuest = !isLoggedIn && Boolean(guestVote);
  const signUpHint = votedAsGuest ? (
    <a href="/register" className="text-[11px] text-orange-400 hover:underline">
      {t("Zählt halb — registrieren, damit sie voll zählt", "Counts half — sign up so it counts fully")}
    </a>
  ) : null;
  const side = duel.sides[sideIndex];
  const other = duel.sides[sideIndex === 0 ? 1 : 0];
  const votes = (n: number) => `${n} ${n === 1 ? t("Stimme", "vote") : t("Stimmen", "votes")}`;
  // Restzeit + Stimmen bisher (nie, wer führt — Blind-Abstimmen).
  const liveInfo = [
    votingEndsAt ? t(`noch ${timeLeftLabel(votingEndsAt, t)}`, `${timeLeftLabel(votingEndsAt, t)} left`) : null,
    votes(tally.total),
  ]
    .filter(Boolean)
    .join(" · ");

  if (isFinished) {
    const result = officialTally ?? tally;
    const driftPct =
      officialTally && tally.total !== officialTally.total && tally.total > 0
        ? Math.round(((sideIndex === 0 ? tally.brandAVotes : tally.brandBVotes) / tally.total) * 100)
        : null;
    const canStillVote = !viewerOwnsThisBattle && !viewerVotedBrandId;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ResultPill sideIndex={sideIndex} tally={result} />
        <span className="text-[11px] text-zinc-300">
          {[
            // Luca 14.11.: auch nach Fristende sehen, wofür man gestimmt hat.
            viewerVotedBrandId
              ? viewerVotedBrandId === side.brandId
                ? t("✓ Deine Stimme", "✓ Your vote")
                : t(`✓ Für ${other.brandName} gestimmt`, `✓ Voted for ${other.brandName}`)
              : null,
            t("Beendet", "Ended"),
            votes(result.total),
            driftPct !== null ? t(`aktuell ${driftPct} %`, `now ${driftPct}%`) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {canStillVote && (
          <button onClick={onVote} disabled={voting} className="text-xs text-orange-400 hover:underline">
            {voting ? "…" : t("Noch abstimmen", "Vote anyway")}
          </button>
        )}
      </div>
    );
  }

  if (viewerOwnsThisBattle) {
    return (
      <p className="text-[11px] text-zinc-300">
        {[side.viewerOwnsThisBrand ? t("Dein Video", "Your video") : t("Dein Gegner", "Your opponent"), liveInfo].filter(Boolean).join(" · ")}
      </p>
    );
  }

  if (viewerVotedBrandId) {
    const votedForThis = viewerVotedBrandId === side.brandId;
    return (
      <div className="flex flex-wrap items-center gap-x-2">
        <p className="text-[11px] text-zinc-300">
          {[votedForThis ? t("✓ Abgestimmt", "✓ Voted") : t(`✓ Für ${other.brandName} gestimmt`, `✓ Voted for ${other.brandName}`), liveInfo].filter(Boolean).join(" · ")}
        </p>
        {signUpHint}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Luca 13.11. (Phase 5): auch ohne Konto (Gast-Stimme). */}
      <button
        onClick={onVote}
        disabled={voting}
        className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
      >
        {voting ? "…" : (
          <>
            <Trophy size={14} /> {t(`Für ${side.brandName} stimmen`, `Vote for ${side.brandName}`)}
          </>
        )}
      </button>
      {liveInfo && <span className="text-[11px] text-zinc-300">{liveInfo}</span>}
    </div>
  );
}

export function FeedDuelCard({
  duel,
  isLoggedIn,
  muted,
  onToggleMute,
  onToggleLike,
  onVote,
  onOpenComments,
  onShare,
  onActive,
}: {
  duel: FeedDuel;
  isLoggedIn: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (duel: FeedDuel, sideIndex: 0 | 1) => void;
  onVote: (duel: FeedDuel, sideIndex: 0 | 1) => Promise<void>;
  onOpenComments: (battleId: string) => void;
  onShare: (duel: FeedDuel) => void;
  /** Phase 43: tells FeedClient this card is the one on screen now, so it can keep only nearby cards' videos mounted. */
  onActive?: () => void;
}) {
  const t = useT();
  // Luca 24.10.: aus einem Profil geöffnet → dessen Video zuerst und links,
  // der Gegner rechts. Nur die Anzeige dreht sich; sideIndex bleibt 0 = A,
  // 1 = B (Stimmen, Ergebnis, Melden). pos = Platz im Streifen (0 links).
  const flipped = duel.leadBrandId === duel.sides[1].brandId;
  const posOf = (i: 0 | 1): 0 | 1 => (flipped ? (i === 0 ? 1 : 0) : i);
  const sideAt = (pos: 0 | 1): 0 | 1 => (flipped ? (pos === 0 ? 1 : 0) : pos);
  const [sideIndex, setSideIndex] = useState<0 | 1>(duel.leadBrandId ? (flipped ? 1 : 0) : duel.initialSideIndex);
  const pos = posOf(sideIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<[HTMLVideoElement | null, HTMLVideoElement | null]>([null, null]);
  const slideRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [voting, setVoting] = useState(false);
  const [shareLabel, setShareLabel] = useState<string | null>(null);
  const trackedViewSides = useRef<Set<0 | 1>>(new Set());
  // Phase 30: tap now pauses/resumes (Luca: "wie bei TikTok") instead of
  // toggling mute — this is the viewer's own intent, separate from
  // `inView`/`sideIndex`, which just gate whether playing is *allowed* at
  // all. Reset to false on every side switch — swiping to the other side
  // should autoplay it, same as TikTok's own next-video behavior.
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [showLikePop, setShowLikePop] = useState(false);
  const lastTapAt = useRef(0);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase 48: Luca — "ein Drittel vom Bildschirm voll mit Dingen... eine
  // Möglichkeit den ganzen Screen leer zu machen, wie bei TikTok/Insta mit
  // Zoomen". Ein echtes Pinch-Zoom-Gesture würde mit dem bestehenden
  // Seiten-Swipe/Tap-Pause kollidieren — ein kleiner, dezenter Knopf erreicht
  // dasselbe Ergebnis (kompletter leerer Bildschirm) ohne dieses Risiko.
  const uiHidden = useCleanScreen();
  useResetCleanScreenWhenActive(inView);

  useEffect(() => {
    return () => {
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, []);
  // Phase 38: a real dragging carousel (Luca: "wie auf Instagram... soll
  // der Bildschirm mit sliden") instead of an instant cut — this ref tracks
  // the in-progress gesture and directly mutates slideRef's transform on
  // every pointermove (never React state, which would re-render every
  // frame and stutter). React only finds out the *outcome* on pointerup.
  const drag = useRef<{ startX: number; startY: number; horizontal: boolean | null } | null>(null);

  const side = duel.sides[sideIndex];

  // Card visibility (scroll-snap) drives whether either video is allowed to play.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting && entry.intersectionRatio >= 0.6);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Only the active side plays — the other stays mounted (keeps its
  // position/loaded state) but paused, so flipping sides is instant and
  // doesn't restart or reload the video you just came from.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      video.muted = muted;
      if (inView && i === sideIndex && !manuallyPaused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [inView, sideIndex, muted, manuallyPaused]);

  function switchSide(next: 0 | 1) {
    setSideIndex(next);
    setManuallyPaused(false);
  }

  // Settles the slider to whichever side is current — covers both a
  // drag-commit (handled inline in handlePointerUp for zero-lag) and a
  // non-drag switch (the "Antwort ansehen" button, or an initial mount).
  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;
    el.style.transition = "transform 250ms ease-out";
    el.style.transform = `translateX(${pos === 0 ? "0%" : "-50%"})`;
  }, [pos]);

  // Phase 16: a "view" is this side's video actually playing on screen —
  // once per side per card, not per re-render (flipping back and forth
  // shouldn't inflate the count).
  // Luca 13.11.: erst nach VIEW_AFTER_MS ununterbrochen im Bild.
  useEffect(() => {
    if (!inView || trackedViewSides.current.has(sideIndex)) return;
    const timer = setTimeout(() => {
      trackedViewSides.current.add(sideIndex);
      trackAnalyticsEvent(duel.sides[sideIndex].brandId, "view", { battleId: duel.battleId });
    }, VIEW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [inView, sideIndex, duel.sides, duel.battleId]);

  useEffect(() => {
    if (inView) onActive?.();
  }, [inView, onActive]);

  async function handleVote() {
    // Phase 47: Vote-Funnel (BETA-2-G) — Klick-Intent, unabhängig vom Ausgang.
    trackAnalyticsEvent(duel.sides[sideIndex].brandId, "vote_click", { battleId: duel.battleId });
    setVoting(true);
    try {
      await onVote(duel, sideIndex);
    } finally {
      setVoting(false);
    }
  }

  function handleShare() {
    onShare(duel);
    trackAnalyticsEvent(duel.sides[0].brandId, "share");
    trackAnalyticsEvent(duel.sides[1].brandId, "share");
    setShareLabel(t("Link kopiert!", "Link copied!"));
    setTimeout(() => setShareLabel(null), 1800);
  }

  // Phase 38: a real dragging carousel between the two sides (Luca: "wie
  // auf Instagram... soll der Bildschirm mit sliden", not an instant cut),
  // tap to pause/resume — pointer events (unifies touch + mouse), never
  // preventDefault, so the page's own vertical scroll-snap between feed
  // cards is never interfered with; a vertical-intent gesture is simply
  // abandoned here (drag.current.horizontal = false) and left to the
  // browser's native scroll.
  const COMMIT_FRACTION = 0.25; // drag past 25% of the card's width commits the side switch
  const TAP_MAX_MOVEMENT_PX = 10;
  const DOUBLE_TAP_MS = 300;

  // Luca 25.10.: Rand gedrückt halten = 2× (wie in der App, schon seit 17.10. im Duell).
  const getVideo = useCallback(() => videoRefs.current[sideIndex], [sideIndex]);
  // Luca 25.10.: gekürzte Videos spielen nur den Ausschnitt.
  useVideoTrim(getVideo, side.trim);
  const trackedCompleteSides = useRef(new Set<number>());
  const handleWatchedToEnd = useCallback(() => {
    if (trackedCompleteSides.current.has(sideIndex)) return;
    trackedCompleteSides.current.add(sideIndex);
    trackAnalyticsEvent(duel.sides[sideIndex].brandId, "complete", { battleId: duel.battleId });
  }, [sideIndex, duel.sides, duel.battleId]);
  useWatchedToEnd(getVideo, side.trim, handleWatchedToEnd);
  useVideoMusic(getVideo, side.music);
  const edge = useEdgeFastForward(() => videoRefs.current[sideIndex]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { startX: e.clientX, startY: e.clientY, horizontal: null };
    edge.onPointerDown(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    edge.onPointerMove(e);
    const d = drag.current;
    if (!d || d.horizontal === false) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.horizontal === null) {
      if (Math.abs(dx) < TAP_MAX_MOVEMENT_PX && Math.abs(dy) < TAP_MAX_MOVEMENT_PX) return; // not decided yet
      d.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!d.horizontal) return; // vertical intent — hand off to native scroll, do nothing more
    }
    // Resistance at the ends — there's no third side to reveal.
    const clampedDx = pos === 0 ? Math.min(0, dx) : Math.max(0, dx);
    const width = containerRef.current?.clientWidth || window.innerWidth;
    const dragPercentOfSlider = (clampedDx / width) * 50; // 50% of the 200%-wide slider == 100% of the card
    const basePercent = pos === 0 ? 0 : -50;
    const el = slideRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = `translateX(calc(${basePercent}% + ${dragPercentOfSlider}%))`;
    }
  }

  // Phase 35: double-tap-to-like layered onto tap/drag classification — a
  // "tap" (small movement) always toggles pause first (zero latency), and
  // if it's the second tap within the window, that second toggle plus a
  // like (never an unlike, matching Instagram).
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (edge.onPointerUp()) return; // war Vorspulen, kein Tipp
    if (!d) return;

    if (d.horizontal) {
      const dx = e.clientX - d.startX;
      const width = containerRef.current?.clientWidth || window.innerWidth;
      if (Math.abs(dx) > width * COMMIT_FRACTION) {
        if (dx < 0 && pos === 0) {
          switchSide(sideAt(1));
          return;
        }
        if (dx > 0 && pos === 1) {
          switchSide(sideAt(0));
          return;
        }
      }
      // Below threshold (or at an edge with nowhere to go) — snap back;
      // the settle effect handles the actual transform since sideIndex
      // hasn't changed.
      const el = slideRef.current;
      if (el) {
        el.style.transition = "transform 250ms ease-out";
        el.style.transform = `translateX(${pos === 0 ? "0%" : "-50%"})`;
      }
      return;
    }
    if (d.horizontal === false) return; // was a vertical gesture, not ours to handle

    // d.horizontal === null: never moved past the tap threshold — a tap.
    // Luca 25.10.: wie in der App — Tipp in die Rand-Zone (je 22 %) wechselt zum anderen Video.
    // Luca 26.10.: links = linkes Video, rechts = rechtes Video (bleibt, wenn es schon läuft).
    const rect = e.currentTarget.getBoundingClientRect();
    if (isInEdgeZone(e.clientX, rect)) {
      const edgePos: 0 | 1 = e.clientX - rect.left < rect.width / 2 ? 0 : 1;
      if (edgePos !== pos) switchSide(sideAt(edgePos));
      return;
    }
    // Phase 43: a first tap only schedules the pause toggle instead of
    // firing it immediately — a second tap within the window cancels it
    // and likes instead, so an intended double-tap-to-like never flashes
    // a pause/resume in between (same fix as the solo-pitch card).
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
      if (!side.viewerLiked) onToggleLike(duel, sideIndex);
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
      data-battle-id={duel.battleId}
      className="relative h-[calc(100dvh-var(--bottom-nav-h))] w-full snap-start snap-always overflow-hidden bg-black"
    >
      {/* Phase 38: both sides sit side by side in one 200%-wide strip — the
          only way to actually *slide* between them (a `hidden` toggle can
          only ever cut instantly). slideRef's transform is mutated directly
          in handlePointerMove, bypassing React state, so dragging tracks
          the finger at full frame rate instead of re-rendering on every
          pointermove. */}
      <div ref={slideRef} className="absolute inset-y-0 left-0 flex h-full" style={{ width: "200%" }}>
        {(flipped ? ([1, 0] as const) : ([0, 1] as const)).map((i) => {
          const s = duel.sides[i];
          return (
          <div key={s.brandId} className="relative h-full w-1/2">
            <video
              ref={(el) => {
                videoRefs.current[i] = el;
                if (el) showFirstFrame(el);
              }}
              src={s.videoUrl}
              className="absolute inset-0 h-full w-full object-cover"
              loop
              muted={muted}
              playsInline
              preload="metadata"
            />
          </div>
          );
        })}
      </div>
      {/* Phase 35: `touch-pan-y` (touch-action: pan-y) — without it, a real
          touchscreen's own gesture recognizer can swallow a horizontal drag
          on an element nested in a vertically-scrollable ancestor before it
          ever reaches these pointer handlers; a mouse-drag in dev tools
          never exercises that path, which is exactly why this looked fine
          during testing but reportedly didn't work on a real phone. Still
          never calls preventDefault, so vertical scroll-snap is untouched. */}
      <div
        className="absolute inset-0 touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => edge.onPointerUp()}
        onContextMenu={(e) => e.preventDefault()}
      />
      <FastForwardBadge visible={edge.fast} />

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
            aria-label={muted ? t("Ton an", "Unmute") : t("Ton aus", "Mute")}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      )}

      {!uiHidden && (
        <>
          {/* Two-sides indicator + edge chevrons. top-4 alone (fixed 16px) sat in
              the same band as feed-client.tsx's safe-area-aware "Feed"/"Folge
              ich" tabs on any notch/Dynamic-Island phone, overlapping them —
              matches that tab bar's own inset instead. */}
          <div
            className="pointer-events-none absolute inset-x-0 flex justify-center gap-1.5"
            style={{ top: "calc(env(safe-area-inset-top) + 44px)" }}
          >
            {([0, 1] as const).map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === pos ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
          {pos === 1 && (
            <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-white/50">
              <ChevronLeft size={28} />
            </div>
          )}
          {pos === 0 && (
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/50">
              <ChevronRight size={28} />
            </div>
          )}

        </>
      )}

      {/* Phase 48: Luca — "Anzeige kann man sicher links oben in die Ecke
          geben, klein". Bleibt auch bei ausgeblendeter Oberfläche stehen:
          DSA Art. 26 (Werbung "in Echtzeit" erkennbar), § 26 MedienG, AI Act
          Art. 50 — Pflichtangaben, kein Bedienelement. */}
      <div
        className="pointer-events-none absolute left-2 flex flex-col items-start gap-1"
        style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        {side.adLabel && <AdLabel />}
        {side.containsAiContent && <AiContentLabel />}
      </div>

      {/* Phase 48: "Wir brauchen eine Möglichkeit den ganzen Screen leer zu
          machen ... entweder einen Button mit ausblenden" — dieser Knopf
          bleibt als einzige Ausnahme sichtbar, damit man die Ansicht wieder
          zurückholen kann. Oben links, unter dem Anzeige/KI-Badge — oben rechts drängen sich schon
          die globale Glocke und (in anderen Kontexten) ein Schließen-Button,
          unten links/rechts sind Info-Text bzw. Action-Leiste belegt. */}
      <button
        onClick={toggleCleanScreen}
        aria-label={uiHidden ? t("Bedienelemente einblenden", "Show controls") : t("Bedienelemente ausblenden", "Hide controls")}
        className="pointer-events-auto absolute left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/70"
        style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}
      >
        {uiHidden ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>

      {/* Bottom info + vote — the card itself now already stops right above
          the BottomNav (--bottom-nav-h), so this just needs a small edge
          margin, not the old large offset that used to clear a translucent
          nav floating on top of a full-height video. */}
      {!uiHidden && (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-4 pr-20">
        <div className="pointer-events-auto mb-2 flex items-center gap-2">
          {/* Luca 13.11. (3): „A vs. B“ in einer Zeile, aktuelle Seite fett (→ Profil), andere Seite antippen = wechseln. */}
          {(flipped ? ([1, 0] as const) : ([0, 1] as const)).map((i, pos) => {
            const s2 = duel.sides[i];
            return (
              <span key={s2.brandId} className="inline-flex items-center gap-1.5">
                {pos === 1 && <span className="text-xs text-orange-300">vs.</span>}
                {i === sideIndex ? (
                  <Link href={`/brands/${s2.brandSlug}`} className="text-sm font-bold text-white hover:underline">
                    {s2.brandName}
                  </Link>
                ) : (
                  <button onClick={() => switchSide(i)} className="text-sm text-white/65 hover:text-white">
                    {s2.brandName}
                  </button>
                )}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400">
            <Eye size={11} /> {compactNumber(duel.viewCount, langOf(t))}
          </span>
        </div>
        {duel.category && (
          <p className="mb-2 text-xs text-zinc-300">
            {t("Aufgabe", "Task")}: {duelCategoryLabel(duel.category, langOf(t))}
          </p>
        )}
        {side.ctaUrl && side.ctaLabel && (
          <CtaLink
            url={side.ctaUrl}
            label={side.ctaLabel}
            code={side.ctaCode}
            target={{ targetType: "battle", targetId: duel.battleId, brandId: side.brandId }}
            onClick={() => trackAnalyticsEvent(side.brandId, "cta_click", { battleId: duel.battleId })}
          />
        )}
        <div className="pointer-events-auto">
          <VoteState duel={duel} sideIndex={sideIndex} isLoggedIn={isLoggedIn} onVote={handleVote} voting={voting} />
        </div>
      </div>
      )}

      {/* Right action rail — pointer-events-none on the wrapper, auto only
          on each button, so the gaps between icons (and, on a duel card,
          anything near this edge) still pass a swipe/tap through to the
          gesture layer instead of being silently swallowed by empty space.
          Luca: the last icon (Melden) should sit in the card's bottom-right
          corner — same small edge margin as the text block on the left. */}
      {!uiHidden && (
      <div className="pointer-events-none absolute bottom-4 right-3 flex flex-col items-center gap-5">
        {/* key=brandId — sonst behält der Knopf beim Seitenwechsel den Stand der anderen Seite. */}
        {!side.viewerOwnsThisBrand && (
          <RailFollowButton key={side.brandId} brandId={side.brandId} isFollowing={side.viewerFollowsBrand} isLoggedIn={isLoggedIn} />
        )}
        <button
          onClick={() => (isLoggedIn ? onToggleLike(duel, sideIndex) : (window.location.href = "/login"))}
          className="pointer-events-auto flex flex-col items-center gap-1 text-white"
          aria-label="Like"
        >
          <Heart size={30} className={side.viewerLiked ? "fill-red-500 text-red-500" : ""} />
          {socialCount(side.likeCount, langOf(t)) ? <span className="text-xs font-medium">{socialCount(side.likeCount, langOf(t))}</span> : null}
        </button>

        <button onClick={() => onOpenComments(duel.battleId)} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <MessageCircle size={28} />
          {socialCount(duel.commentCount, langOf(t)) ? <span className="text-xs font-medium">{socialCount(duel.commentCount, langOf(t))}</span> : null}
        </button>

        <button onClick={handleShare} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <Share2 size={26} />
          <span className="text-xs font-medium">{shareLabel ? t("Kopiert", "Copied") : t("Teilen", "Share")}</span>
        </button>

        <ReportButton
          targetType={sideIndex === 0 ? "battle_a" : "battle_b"}
          targetId={duel.battleId}
          isLoggedIn={isLoggedIn}
          // Wie in der App: die gerade gezeigte Seite zuerst, eigene Marke nie.
          blockOptions={(sideIndex === 0 ? duel.sides : [duel.sides[1], duel.sides[0]])
            .filter((side) => !side.viewerOwnsThisBrand)
            .map((side) => ({ name: side.brandName, target: { brandId: side.brandId } }))}
        />
      </div>
      )}
      {/* Luca 25.10.: Spulleiste wie in der App. */}
      <SeekBar getVideo={getVideo} active={inView} trim={side.trim} />
    </div>
  );
}
