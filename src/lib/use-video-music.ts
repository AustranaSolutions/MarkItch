"use client";

import { useEffect } from "react";

// Luca 05.11.: Musik aus der MarkItch-Bibliothek unter einem Video (lib/music-library.ts).
// Kein Neuberechnen: ein <audio> läuft in Schleife mit — Abspielen, Pause, Stumm
// und Lautstärke folgen dem Video. Originalton auf `originalVolume` (0 = stumm).
// Gleiche Logik wie in der App (lib/video-music.ts).

export type Music = { url: string; musicVolume: number; originalVolume: number } | null | undefined;

export function useVideoMusic(getVideo: () => HTMLVideoElement | null, music: Music) {
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
    syncVolume();
    if (!video.paused) play();
    video.addEventListener("play", play);
    video.addEventListener("playing", play);
    video.addEventListener("pause", pause);
    video.addEventListener("ended", pause);
    video.addEventListener("volumechange", syncVolume);
    return () => {
      video.removeEventListener("play", play);
      video.removeEventListener("playing", play);
      video.removeEventListener("pause", pause);
      video.removeEventListener("ended", pause);
      video.removeEventListener("volumechange", syncVolume);
      audio.pause();
      audio.src = "";
      video.volume = 1;
    };
  }, [getVideo, url, musicVolume, originalVolume]);
}
