"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Luca 25.10.: Website = App (MarkItch-mobile components/post/trim-editor.tsx).
// Video kürzen ohne Neuberechnen: Anfang und Ende wählen, gespeichert wird nur
// der Ausschnitt (lib/video-trims.ts) — App und Web spielen dann nur ihn.

const MIN_SECONDS = 1;

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const whole = Math.floor(s);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")},${Math.floor((s - whole) * 10)}`;
}

export type TrimValue = { startMs: number; endMs: number | null };

export function TrimEditor({
  src,
  initial,
  onClose,
  onDone,
}: {
  src: string;
  initial?: TrimValue | null;
  onClose: () => void;
  /** `null` = nicht gekürzt (ganzes Video). */
  onDone: (trim: TrimValue | null) => Promise<void> | void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState((initial?.startMs ?? 0) / 1000);
  const [end, setEnd] = useState<number | null>(initial?.endMs != null ? initial.endMs / 1000 : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const effectiveEnd = end ?? duration;

  // Vorschau in Schleife nur im gewählten Ausschnitt.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || duration <= 0) return;
    const onTime = () => {
      if (video.currentTime >= effectiveEnd - 0.05 || video.currentTime < start - 0.1) video.currentTime = start;
    };
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [start, effectiveEnd, duration]);

  const seek = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const untrimmed = start <= 0.05 && effectiveEnd >= duration - 0.05;
      await onDone(untrimmed ? null : { startMs: Math.round(start * 1000), endMs: effectiveEnd >= duration - 0.05 ? null : Math.round(effectiveEnd * 1000) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-black px-4 pb-6 pt-4" role="dialog" aria-modal="true" aria-label="Video kürzen">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={onClose} aria-label="Schließen" className="text-zinc-300 hover:text-white">
            <X size={24} />
          </button>
          <h2 className="text-base font-bold text-white">Video kürzen</h2>
          <span className="w-6" />
        </div>
        <p className="mb-3 text-center text-xs text-zinc-400">Wähle Anfang und Ende — gezeigt wird nur dieser Teil.</p>

        <div className="relative mx-auto aspect-[9/16] max-h-[50vh] overflow-hidden rounded-xl bg-zinc-900">
          <video
            ref={videoRef}
            src={src}
            muted
            playsInline
            autoPlay
            loop
            preload="auto"
            className="h-full w-full object-cover"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              setDuration(Number.isFinite(d) ? d : 0);
              e.currentTarget.currentTime = start;
            }}
          />
        </div>

        {duration > 0 && (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 flex justify-between text-xs text-zinc-400">
                <span>Anfang</span>
                <span className="tabular-nums text-white">{formatTime(start)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(0, duration - MIN_SECONDS)}
                step={0.1}
                value={start}
                onChange={(e) => {
                  const v = Math.min(Number(e.target.value), effectiveEnd - MIN_SECONDS);
                  setStart(Math.max(0, v));
                  seek(Math.max(0, v));
                }}
                className="w-full accent-orange-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex justify-between text-xs text-zinc-400">
                <span>Ende</span>
                <span className="tabular-nums text-white">{formatTime(effectiveEnd)}</span>
              </span>
              <input
                type="range"
                min={MIN_SECONDS}
                max={duration}
                step={0.1}
                value={effectiveEnd}
                onChange={(e) => {
                  const v = Math.max(Number(e.target.value), start + MIN_SECONDS);
                  setEnd(Math.min(duration, v));
                  seek(Math.max(start, Math.min(duration, v) - 1));
                }}
                className="w-full accent-orange-500"
              />
            </label>
            <p className="text-center text-sm text-zinc-300">
              Länge: <span className="font-bold tabular-nums text-white">{formatTime(effectiveEnd - start)}</span> von {formatTime(duration)}
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
        <div className="mt-auto flex gap-2 pt-4">
          <button
            type="button"
            onClick={() => {
              setStart(0);
              setEnd(null);
              seek(0);
            }}
            className="flex-1 rounded-full border border-zinc-700 py-3 text-sm font-semibold text-white hover:border-zinc-500"
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || duration === 0}
            className="flex-1 rounded-full bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-40"
          >
            {saving ? "Wird gespeichert…" : "Übernehmen"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Kürzung für ein eigenes Video speichern (gleiche Schnittstelle wie die App). */
export async function saveTrim(videoUrl: string, trim: TrimValue | null): Promise<TrimValue | null> {
  const res = await fetch("/api/mobile/trims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoUrl, startMs: trim?.startMs ?? 0, endMs: trim?.endMs ?? null }),
  });
  const data = (await res.json().catch(() => ({}))) as { trim?: TrimValue | null; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kürzen fehlgeschlagen.");
  return data.trim ?? null;
}
