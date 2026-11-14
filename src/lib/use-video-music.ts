"use client";

import { useEffect } from "react";

// Luca 05.11.: Musik aus der MarkItch-Bibliothek unter einem Video (lib/music-library.ts).
// Kein Neuberechnen: ein <audio> läuft in Schleife mit — Abspielen, Pause, Stumm
// und Lautstärke folgen dem Video. Originalton auf `originalVolume` (0 = stumm).
// Gleiche Logik wie in der App (lib/video-music.ts).

export type Music = { url: string; musicVolume: number; originalVolume: number } | null | undefined;

/** Ab so viel Abweichung (Sekunden) springt die Musik an die passende Stelle. */
const MAX_DRIFT_S = 0.35;

export function useVideoMusic(
  getVideo: () => HTMLVideoElement | null,
  music: Music,
  /** Gekürztes Video: die Musik beginnt am Anfang des Ausschnitts. */
  trim?: { startMs: number } | null,
) {
  const startSec = (trim?.startMs ?? 0) / 1000;
  const url = music?.url ?? null;
  const musicVolume = music?.musicVolume ?? 0;
  const originalVolume = music?.originalVolume ?? 100;
  useEffect(() => {
    if (!url) return;
    const video = getVideo();
    if (!video) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = musicVolume / 100;
    const syncVolume = () => {
      // Originalton leiser/stumm; „Ton aus“ im Feed (video.muted) schaltet beides stumm.
      video.volume = originalVolume / 100;
      audio.muted = video.muted;
    };
    const play = () => {
      syncVolume();
      audio.play().catch(() => {});
    };
    const pause = () => audio.pause();
    // Luca 14.11.: Musik folgt der Position des Videos (Vorspulen, Zurückspulen, Schleife).
    const syncPosition = () => {
      const length = audio.duration;
      if (!length || !Number.isFinite(length)) return;
      const expected = (((video.currentTime - startSec) % length) + length) % length;
      const diff = Math.abs(audio.currentTime - expected);
      if (diff > MAX_DRIFT_S && length - diff > MAX_DRIFT_S) audio.currentTime = expected;
    };
    syncVolume();
    if (!video.paused) play();
    video.addEventListener("play", play);
    video.addEventListener("playing", play);
    video.addEventListener("pause", pause);
    video.addEventListener("ended", pause);
    video.addEventListener("volumechange", syncVolume);
    video.addEventListener("seeked", syncPosition);
    video.addEventListener("timeupdate", syncPosition);
    return () => {
      video.removeEventListener("seeked", syncPosition);
      video.removeEventListener("timeupdate", syncPosition);
      video.removeEventListener("play", play);
      video.removeEventListener("playing", play);
      video.removeEventListener("pause", pause);
      video.removeEventListener("ended", pause);
      video.removeEventListener("volumechange", syncVolume);
      audio.pause();
      audio.src = "";
      video.volume = 1;
    };
  }, [getVideo, url, musicVolume, originalVolume, startSec]);
}
