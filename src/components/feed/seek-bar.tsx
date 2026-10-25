"use client";

import { useEffect, useRef, useState } from "react";
import { trimRange, type Trim } from "@/lib/use-video-trim";

// Luca 25.10.: Website = App (MarkItch-mobile components/feed/seek-bar.tsx) —
// Spulleiste unten auf jeder Video-Karte: antippen springt, ziehen spult.
// Beim Ziehen wird sie dicker und zeigt die Zeit.

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SeekBar({ getVideo, active, trim }: { getVideo: () => HTMLVideoElement | null; active: boolean; /** Gekürzt: Leiste zeigt nur den Ausschnitt. */ trim?: Trim }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragFraction, setDragFraction] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => {
      const video = getVideo();
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        const { start, end } = trimRange(trim, video.duration);
        setOffset(start);
        setDuration(end - start);
        setProgress(Math.min(1, Math.max(0, (video.currentTime - start) / (end - start))));
      }
      frame = window.setTimeout(tick, 250);
    };
    tick();
    return () => window.clearTimeout(frame);
  }, [active, getVideo, trim]);

  if (!active || duration <= 0) return null;

  const fractionAt = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const shown = dragFraction ?? progress;
  const dragging = dragFraction !== null;

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Video-Position"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown * duration)}
      aria-valuetext={`${formatTime(shown * duration)} von ${formatTime(duration)}`}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-6 cursor-pointer touch-none items-end"
      // Eigene Geste: Karten-Tipp (Pause) und Duell-Wischen nicht auslösen.
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.stopPropagation();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Manche Browser kennen den Zeiger nicht (z. B. synthetische Ereignisse) — Tippen geht trotzdem.
        }
        setDragFraction(fractionAt(e.clientX));
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (dragFraction !== null) setDragFraction(fractionAt(e.clientX));
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const f = fractionAt(e.clientX);
        const video = getVideo();
        if (video) video.currentTime = offset + f * duration;
        setProgress(f);
        setDragFraction(null);
      }}
      onPointerCancel={() => setDragFraction(null)}
    >
      {dragging && (
        <span className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-lg font-bold tabular-nums text-white [text-shadow:0_0_6px_rgba(0,0,0,0.85)]">
          {formatTime(shown * duration)} / {formatTime(duration)}
        </span>
      )}
      <div className={`w-full bg-white/25 ${dragging ? "h-[5px]" : "h-[2px]"}`}>
        <div className="h-full bg-white/90" style={{ width: `${shown * 100}%` }} />
      </div>
    </div>
  );
}
