"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, X } from "lucide-react";

// Luca 25.10.: Website = App (MarkItch-mobile components/post/thumbnail-editor.tsx).
// Titelbild für die Profil-Kacheln: mit dem Regler ein Bild aus dem Video wählen
// oder ein eigenes Foto. Ergebnis: JPEG, 720 px breit.
//
// Ein Bild aus einem schon geposteten Video lesen darf der Browser nur, wenn der
// Video-Speicher das erlaubt (CORS). Ist das nicht so, bleibt „Eigenes Foto“.

const OUTPUT_WIDTH = 720;

function toJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const scale = Math.min(1, OUTPUT_WIDTH / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Kein Canvas"));
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Leeres Bild"))), "image/jpeg", 0.82);
    } catch (err) {
      reject(err);
    }
  });
}

export function ThumbnailEditor({
  src,
  remote = false,
  onClose,
  onPicked,
}: {
  /** Lokale Datei (blob:) beim Hochladen oder Adresse eines geposteten Videos. */
  src: string;
  /** true = gepostetes Video: Bild nur lesbar, wenn der Speicher CORS erlaubt. */
  remote?: boolean;
  onClose: () => void;
  onPicked: (image: Blob) => Promise<void> | void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [frameAllowed, setFrameAllowed] = useState(true);
  const [useCors, setUseCors] = useState(remote);
  const [photo, setPhoto] = useState<{ url: string; blob: Blob } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const seek = (t: number) => {
    setTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      let blob: Blob;
      if (photo) {
        const img = new Image();
        img.src = photo.url;
        await img.decode();
        blob = await toJpeg(img, img.naturalWidth, img.naturalHeight);
      } else {
        const video = videoRef.current;
        if (!video || !video.videoWidth) throw new Error("Video noch nicht geladen.");
        blob = await toJpeg(video, video.videoWidth, video.videoHeight);
      }
      await onPicked(blob);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === "SecurityError") {
        setFrameAllowed(false);
        setError("Ein Bild aus diesem Video kann der Browser gerade nicht übernehmen — bitte ein eigenes Foto wählen.");
      } else {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 px-4 pb-6 pt-4" role="dialog" aria-modal="true" aria-label="Titelbild wählen">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={onClose} aria-label="Schließen" className="text-zinc-300 hover:text-white">
            <X size={24} />
          </button>
          <h2 className="text-base font-bold text-white">Titelbild</h2>
          <span className="w-6" />
        </div>
        <p className="mb-3 text-center text-xs text-zinc-400">Nur für die Kacheln in deinem Profil — im Feed läuft das Video.</p>

        <div className="relative mx-auto aspect-[9/16] max-h-[55vh] w-auto overflow-hidden rounded-xl bg-zinc-900">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <video
              key={useCors ? "cors" : "plain"}
              ref={videoRef}
              src={src}
              crossOrigin={useCors ? "anonymous" : undefined}
              muted
              playsInline
              preload="auto"
              className="h-full w-full object-cover"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                setDuration(Number.isFinite(d) ? d : 0);
                e.currentTarget.currentTime = Math.min(0.1, d || 0);
              }}
              onError={() => {
                // Speicher ohne CORS: mit crossOrigin lädt das Video gar nicht → ohne laden, nur Vorschau.
                if (useCors) {
                  setUseCors(false);
                  setFrameAllowed(false);
                }
              }}
            />
          )}
        </div>

        {!photo && duration > 0 && (
          <input
            type="range"
            min={0}
            max={Math.max(0, duration - 0.05)}
            step={0.05}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Stelle im Video"
            className="mt-4 w-full accent-orange-500"
          />
        )}
        {!frameAllowed && !photo && (
          <p className="mt-3 text-center text-xs text-orange-400">
            Ein Bild aus diesem Video kann die Website gerade nicht übernehmen — bitte ein eigenes Foto wählen (in der App geht beides).
          </p>
        )}

        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-700 py-2.5 text-sm font-semibold text-white hover:border-zinc-500">
          <ImagePlus size={16} />
          {photo ? "Anderes Foto" : "Eigenes Foto wählen"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPhoto({ url: URL.createObjectURL(file), blob: file });
            }}
          />
        </label>
        {photo && (
          <button type="button" onClick={() => setPhoto(null)} className="mt-2 text-sm text-zinc-400 hover:text-white">
            Doch ein Bild aus dem Video
          </button>
        )}

        {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={save}
          disabled={saving || (!photo && (!frameAllowed || duration === 0))}
          className="mt-auto w-full rounded-full bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-40"
        >
          {saving ? "Wird gespeichert…" : "Übernehmen"}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Titelbild für ein eigenes Video speichern (gleiche Schnittstelle wie die App). */
export async function uploadThumbnail(videoUrl: string, image: Blob): Promise<string> {
  const form = new FormData();
  form.append("videoUrl", videoUrl);
  form.append("image", new File([image], "titelbild.jpg", { type: "image/jpeg" }));
  const res = await fetch("/api/mobile/thumbnails", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { thumbnailUrl?: string; error?: string };
  if (!res.ok || !data.thumbnailUrl) throw new Error(data.error ?? "Titelbild konnte nicht gespeichert werden.");
  return data.thumbnailUrl;
}
