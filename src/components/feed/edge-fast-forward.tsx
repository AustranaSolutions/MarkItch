"use client";

import { useRef, useState } from "react";

// Luca 25.10.: Website = App (MarkItch-mobile components/feed/edge-fast-forward.tsx).
// Am linken oder rechten Rand (ca. 0,5 cm) gedrückt halten = 2× vorspulen, loslassen = normal.
// Kurzes Tippen bleibt, was es war (Pause / Doppeltipp-Like) — die Karten fragen
// nach dem Loslassen `consumed()` und ignorieren den Tipp dann.

const EDGE_PX = 28;
const HOLD_MS = 300;
const MOVE_CANCEL_PX = 12;

export function useEdgeFastForward(getVideo: () => HTMLVideoElement | null) {
  const [fast, setFast] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const wasFast = useRef(false);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
    if (wasFast.current) {
      const video = getVideo();
      if (video) video.playbackRate = 1;
      setFast(false);
    }
  };

  return {
    fast,
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      wasFast.current = false;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x > EDGE_PX && x < rect.width - EDGE_PX) return;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        const video = getVideo();
        if (!video) return;
        video.playbackRate = 2;
        wasFast.current = true;
        setFast(true);
        navigator.vibrate?.(10);
      }, HOLD_MS);
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s || wasFast.current) return;
      if (Math.abs(e.clientX - s.x) > MOVE_CANCEL_PX || Math.abs(e.clientY - s.y) > MOVE_CANCEL_PX) stop();
    },
    /** Beim Loslassen: true = es wurde vorgespult, den Tipp also nicht als Pause/Like werten. */
    onPointerUp(): boolean {
      const consumed = wasFast.current;
      stop();
      return consumed;
    },
  };
}

export function FastForwardBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[max(5rem,calc(env(safe-area-inset-top)+4.5rem))] z-10 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1 text-sm font-bold text-white">
      2× ▸▸
    </div>
  );
}
