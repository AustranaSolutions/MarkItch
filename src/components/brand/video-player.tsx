"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/i18n/lang-provider";

// Phase 30: no native `controls` — that gave every video the browser's own
// OS-level media bar (a fullscreen-expand icon, AirPlay, a scrubber), which
// is exactly what Luca flagged as looking wrong next to TikTok/Instagram:
// there, a video is just the video, tap to play/pause, no browser chrome at
// all. Same tap-to-toggle pattern as the feed cards and
// SoloPitchDetailOverlay.
export function VideoPlayer({ src, className = "" }: { src: string; className?: string }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <div className={`relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black ${className}`}>
      <video ref={videoRef} src={src} playsInline loop className="h-full w-full object-cover" onClick={toggle} />
      {!playing && (
        <button
          onClick={toggle}
          aria-label={t("Abspielen", "Play")}
          className="absolute inset-0 flex items-center justify-center bg-black/10"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-3xl text-white">
            ▶
          </span>
        </button>
      )}
    </div>
  );
}
