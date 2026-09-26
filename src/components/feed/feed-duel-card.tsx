"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Play,
  RefreshCw,
  Share2,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { FollowButton } from "@/components/brand/follow-button";
import { ReportButton } from "@/components/moderation/report-button";
import { AdLabel, AiContentLabel } from "@/components/ui";
import type { FeedDuel } from "@/lib/feed";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

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

function timeLeftLabel(iso: string): string {
  const hoursLeft = Math.max(0, (new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000));
  if (hoursLeft >= 24) return `${Math.ceil(hoursLeft / 24)} Tage`;
  return `${Math.max(1, Math.ceil(hoursLeft))}h`;
}

function outcomeLabel(sideIndex: 0 | 1, tally: FeedDuel["tally"]): { label: string; won: boolean } | null {
  if (tally.total === 0) return null;
  if (tally.brandAVotes === tally.brandBVotes) return { label: "Unentschieden", won: false };
  const won = (sideIndex === 0 && tally.brandAVotes > tally.brandBVotes) || (sideIndex === 1 && tally.brandBVotes > tally.brandAVotes);
  return { label: won ? "Gewonnen" : "Verloren", won };
}

function ResultLine({ sideIndex, tally, prefix }: { sideIndex: 0 | 1; tally: FeedDuel["tally"]; prefix?: React.ReactNode }) {
  const sideVotes = sideIndex === 0 ? tally.brandAVotes : tally.brandBVotes;
  const pct = tally.total === 0 ? 0 : Math.round((sideVotes / tally.total) * 100);
  const outcome = outcomeLabel(sideIndex, tally);
  return (
    <p className="flex items-center gap-1 text-xs text-zinc-300">
      {prefix && <span className="text-zinc-500">{prefix} </span>}
      {outcome && (
        <span className="inline-flex items-center gap-1 font-semibold text-orange-400">
          {outcome.won && <Trophy size={12} />}
          {outcome.label} ·
        </span>
      )}
      {pct}% ({tally.total} {tally.total === 1 ? "Stimme" : "Stimmen"})
    </p>
  );
}

// Phase 12: two things were lost when the Feed replaced the old battle-
// detail page as the only place to actually vote, both restored here:
//   1. Before a Pitch is finished, the split never shows — only the running
//      total ("340 Stimmen bisher") — same "don't create a bandwagon effect"
//      reasoning as Phase 7's VotePanel, which this component has fully
//      replaced (that component and its now-orphaned server action were
//      removed in this phase).
//   2. Voting doesn't actually stop once a Pitch is "finished" — the
//      official result freezes at votingEndsAt (`officialTally`), but anyone
//      who hasn't voted yet can still vote afterwards, and `tally` (the
//      live, ever-growing count) is shown alongside the frozen one whenever
//      they've diverged — that's the whole point of not cutting voting off.
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
  const { tally, officialTally, isFinished, viewerVotedBrandId, viewerOwnsThisBattle, votingEndsAt } = duel;
  const side = duel.sides[sideIndex];

  if (viewerOwnsThisBattle) {
    return <p className="text-xs text-zinc-400">Das ist dein eigener Pitch</p>;
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-1">
        {tally.total > 0 && <p className="text-xs text-zinc-500">{tally.total} {tally.total === 1 ? "Stimme" : "Stimmen"} bisher</p>}
        <a
          href="/login"
          onClick={() => trackAnalyticsEvent(side.brandId, "login_required", { battleId: duel.battleId })}
          className="text-xs text-orange-400 hover:underline"
        >
          Anmelden, um abzustimmen
        </a>
      </div>
    );
  }

  const hasDiverged = isFinished && officialTally && tally.total !== officialTally.total;
  const officialResult = isFinished && officialTally ? <ResultLine sideIndex={sideIndex} tally={officialTally} prefix="Ergebnis:" /> : null;
  const liveDrift = hasDiverged ? (
    <ResultLine
      sideIndex={sideIndex}
      tally={tally}
      prefix={
        <span className="inline-flex items-center gap-1">
          <RefreshCw size={11} /> Aktuell:
        </span>
      }
    />
  ) : null;

  if (viewerVotedBrandId) {
    const votedForThis = viewerVotedBrandId === side.brandId;
    return (
      <div className="space-y-1">
        <p className="text-xs text-orange-400">
          {votedForThis ? "✓ Du hast für diese Seite gestimmt" : "✓ Du hast für die Gegenseite gestimmt"}
        </p>
        {officialResult ?? (
          <p className="text-xs text-zinc-500">
            {tally.total} {tally.total === 1 ? "Stimme" : "Stimmen"} bisher — wer führt, bleibt geheim bis Fristende.
          </p>
        )}
        {liveDrift}
      </div>
    );
  }

  // Phase 48: Luca — "ein Drittel vom Bildschirm voll mit Dingen". Die
  // Erklärung ("wer führt, bleibt geheim bis...") war eine eigene Zeile für
  // sich, obwohl sie neben dem Button Platz gehabt hätte — jetzt ein
  // einziges kompaktes Häppchen direkt neben dem Stimmen-Button statt einer
  // zusätzlichen Zeile darunter.
  return (
    <div className="space-y-1">
      {officialResult}
      {liveDrift}
      {isFinished && <p className="text-xs text-zinc-500">Die Frist ist zwar um, du kannst aber trotzdem noch abstimmen:</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={onVote}
          disabled={voting}
          className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
        >
          {voting ? "…" : (
            <>
              <Trophy size={14} /> Für {side.brandName} stimmen
            </>
          )}
        </button>
        {!isFinished && votingEndsAt && (
          <span className="text-[11px] text-zinc-500">Noch {timeLeftLabel(votingEndsAt)}</span>
        )}
      </div>
      {!isFinished && tally.total > 0 && (
        <p className="text-[11px] text-zinc-500">{tally.total} {tally.total === 1 ? "Stimme" : "Stimmen"} bisher</p>
      )}
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
  const [sideIndex, setSideIndex] = useState<0 | 1>(duel.initialSideIndex);
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
  const [uiHidden, setUiHidden] = useState(false);

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
  const opponent = duel.sides[sideIndex === 0 ? 1 : 0];

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
    el.style.transform = `translateX(${sideIndex === 0 ? "0%" : "-50%"})`;
  }, [sideIndex]);

  // Phase 16: a "view" is this side's video actually playing on screen —
  // once per side per card, not per re-render (flipping back and forth
  // shouldn't inflate the count).
  useEffect(() => {
    if (!inView || trackedViewSides.current.has(sideIndex)) return;
    trackedViewSides.current.add(sideIndex);
    trackAnalyticsEvent(duel.sides[sideIndex].brandId, "view", { battleId: duel.battleId });
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
    setShareLabel("Link kopiert!");
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

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { startX: e.clientX, startY: e.clientY, horizontal: null };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
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
    const clampedDx = sideIndex === 0 ? Math.min(0, dx) : Math.max(0, dx);
    const width = containerRef.current?.clientWidth || window.innerWidth;
    const dragPercentOfSlider = (clampedDx / width) * 50; // 50% of the 200%-wide slider == 100% of the card
    const basePercent = sideIndex === 0 ? 0 : -50;
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
    if (!d) return;

    if (d.horizontal) {
      const dx = e.clientX - d.startX;
      const width = containerRef.current?.clientWidth || window.innerWidth;
      if (Math.abs(dx) > width * COMMIT_FRACTION) {
        if (dx < 0 && sideIndex === 0) {
          switchSide(1);
          return;
        }
        if (dx > 0 && sideIndex === 1) {
          switchSide(0);
          return;
        }
      }
      // Below threshold (or at an edge with nowhere to go) — snap back;
      // the settle effect handles the actual transform since sideIndex
      // hasn't changed.
      const el = slideRef.current;
      if (el) {
        el.style.transition = "transform 250ms ease-out";
        el.style.transform = `translateX(${sideIndex === 0 ? "0%" : "-50%"})`;
      }
      return;
    }
    if (d.horizontal === false) return; // was a vertical gesture, not ours to handle

    // d.horizontal === null: never moved past the tap threshold — a tap.
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
        {duel.sides.map((s, i) => (
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
        ))}
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
      />

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
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === sideIndex ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
          {sideIndex === 1 && (
            <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-white/50">
              <ChevronLeft size={28} />
            </div>
          )}
          {sideIndex === 0 && (
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/50">
              <ChevronRight size={28} />
            </div>
          )}

          {/* Phase 48: Luca — "Anzeige kann man sicher links oben in die Ecke
              geben, klein" statt mitten in der ohnehin vollen unteren Zeile. */}
          <div
            className="pointer-events-none absolute left-2 flex flex-col items-start gap-1"
            style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
          >
            <AdLabel />
            {side.containsAiContent && <AiContentLabel />}
          </div>
        </>
      )}

      {/* Phase 48: "Wir brauchen eine Möglichkeit den ganzen Screen leer zu
          machen ... entweder einen Button mit ausblenden" — dieser Knopf
          bleibt als einzige Ausnahme sichtbar, damit man die Ansicht wieder
          zurückholen kann. Oben links, unter dem Anzeige/KI-Badge (das beim
          Ausblenden ohnehin verschwindet) — oben rechts drängen sich schon
          die globale Glocke und (in anderen Kontexten) ein Schließen-Button,
          unten links/rechts sind Info-Text bzw. Action-Leiste belegt. */}
      <button
        onClick={() => setUiHidden((h) => !h)}
        aria-label={uiHidden ? "Bedienelemente einblenden" : "Bedienelemente ausblenden"}
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
          <Link href={`/brands/${side.brandSlug}`} className="text-sm font-bold text-white hover:underline">
            {side.brandName}
          </Link>
          {!side.viewerOwnsThisBrand && isLoggedIn && (
            // Phase 48: key={brandId} — ohne das behält der Button beim
            // Swipe zur anderen Duell-Seite seinen alten "folge ich"-Zustand
            // (React tauscht sonst nur die Props, das Bauteil bleibt
            // dasselbe), Luca: "steht dass ich beiden folge, obwohl ich nur
            // einem folge". Der key erzwingt einen frischen Mount pro Seite.
            <FollowButton key={side.brandId} brandId={side.brandId} isFollowing={side.viewerFollowsBrand} />
          )}
          {duel.isFinished && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">Beendet</span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400">
            <Eye size={11} /> {duel.viewCount}
          </span>
        </div>
        {side.ctaUrl && side.ctaLabel && (
          <a
            href={side.ctaUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => trackAnalyticsEvent(side.brandId, "cta_click", { battleId: duel.battleId })}
            className="pointer-events-auto mb-2 inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-500"
          >
            {side.ctaLabel} →
          </a>
        )}
        <div className="pointer-events-auto mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-300">
          <button
            onClick={() => switchSide(sideIndex === 0 ? 1 : 0)}
            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-orange-300 hover:border-orange-400"
          >
            <ArrowLeftRight size={12} /> Antwort von {opponent.brandName} ansehen
          </button>
        </div>
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
        <button
          onClick={() => (isLoggedIn ? onToggleLike(duel, sideIndex) : (window.location.href = "/login"))}
          className="pointer-events-auto flex flex-col items-center gap-1 text-white"
          aria-label="Like"
        >
          <Heart size={30} className={side.viewerLiked ? "fill-red-500 text-red-500" : ""} />
          <span className="text-xs font-medium">{side.likeCount}</span>
        </button>

        <button onClick={() => onOpenComments(duel.battleId)} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <MessageCircle size={28} />
          <span className="text-xs font-medium">{duel.commentCount}</span>
        </button>

        <button onClick={handleShare} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
          <Share2 size={26} />
          <span className="text-xs font-medium">{shareLabel ? "Kopiert" : "Teilen"}</span>
        </button>

        <ReportButton
          targetType={sideIndex === 0 ? "battle_a" : "battle_b"}
          targetId={duel.battleId}
          isLoggedIn={isLoggedIn}
        />
      </div>
      )}
    </div>
  );
}
