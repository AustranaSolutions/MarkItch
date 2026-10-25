"use client";

import { useEffect } from "react";

// Luca 25.10.: Video kürzen ohne Neuberechnen (lib/video-trims.ts) — der Player
// spielt nur [start, end): beim Laden auf den Anfang, am Ende zurück zum Anfang
// (die Karten laufen in Schleife). Gleiche Logik wie in der App (lib/video-trim.ts).

export type Trim = { startMs: number; endMs: number | null } | null | undefined;

export function trimRange(trim: Trim, duration: number): { start: number; end: number } {
  const start = trim ? Math.min(trim.startMs / 1000, Math.max(0, duration - 0.5)) : 0;
  const end = trim?.endMs ? Math.min(trim.endMs / 1000, duration) : duration;
  return { start, end: Math.max(end, start + 0.5) };
}

export function useVideoTrim(getVideo: () => HTMLVideoElement | null, trim: Trim) {
  const startMs = trim?.startMs ?? 0;
  const endMs = trim?.endMs ?? null;
  useEffect(() => {
    if (!startMs && endMs === null) return;
    const video = getVideo();
    if (!video) return;
    const range = () => trimRange({ startMs, endMs }, Number.isFinite(video.duration) ? video.duration : Infinity);
    const toStart = () => {
      const { start, end } = range();
      if (video.currentTime < start - 0.05 || video.currentTime >= end) video.currentTime = start;
    };
    const onTime = () => {
      const { start, end } = range();
      if (video.currentTime >= end - 0.05) video.currentTime = start;
    };
    if (video.readyState >= 1) toStart();
    video.addEventListener("loadedmetadata", toStart);
    video.addEventListener("play", toStart);
    video.addEventListener("timeupdate", onTime);
    return () => {
      video.removeEventListener("loadedmetadata", toStart);
      video.removeEventListener("play", toStart);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [getVideo, startMs, endMs]);
}
