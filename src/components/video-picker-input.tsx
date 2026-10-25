"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, FolderOpen, ImageIcon, Scissors } from "lucide-react";
import { TrimEditor, saveTrim, type TrimValue } from "@/components/trim-editor";
import { ThumbnailEditor, uploadThumbnail } from "@/components/thumbnail-editor";
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES, type VideoUploadFolder } from "@/lib/video-constants";

type UploadState = "idle" | "uploading" | "done" | "error";

/**
 * Phase 22: every video upload form used a plain `<input type=file>`, which
 * on mobile just opens the OS picker (gallery vs. camera buried behind an
 * extra tap, varies by browser). Classic social apps put "film it now" and
 * "pick an existing file" side by side as the first thing you see — this
 * does the same with one hidden input and two buttons that toggle its
 * `capture` attribute before triggering it, so exactly one file ever ends
 * up in the form's `video` field regardless of which button was used.
 *
 * Phase 27.1: once a file is picked, show it actually playing — like
 * Insta/TikTok's "does this look right?" step — instead of just a filename.
 *
 * Phase 29: the file itself no longer travels through the eventual "post"
 * Server Action at all (Vercel's Serverless Functions cap a request body
 * at 4.5 MB, hard — see storage.ts). Selecting a file now immediately
 * starts a direct-to-storage upload in the background; the surrounding
 * form only ever submits the resulting small `videoUrl` string once this
 * component's upload finishes. `onUploadStateChange` tells the parent
 * form when it's safe to submit (and blocks it otherwise).
 */
export function VideoPickerInput({
  folder,
  urlFieldName = "videoUrl",
  onUploadStateChange,
  withThumbnail = folder !== "videos",
}: {
  folder: VideoUploadFolder;
  urlFieldName?: string;
  onUploadStateChange?: (state: { uploading: boolean; uploadedUrl: string | null }) => void;
  /** Luca 25.10.: Titelbild fürs Profil wählen (wie in der App) — nicht beim Vorstellungsvideo. */
  withThumbnail?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Titelbild: gewählt vor oder nach dem Upload-Ende — gespeichert wird, sobald beides da ist.
  const [thumbnail, setThumbnail] = useState<{ url: string; blob: Blob } | null>(null);
  const [thumbnailOpen, setThumbnailOpen] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const thumbnailRef = useRef<Blob | null>(null);
  // Kürzen (Luca 25.10.): wie das Titelbild — gespeichert, sobald der Upload fertig ist.
  const [trim, setTrim] = useState<TrimValue | null>(null);
  const [trimOpen, setTrimOpen] = useState(false);
  const trimRef = useRef<TrimValue | null>(null);
  const persistTrim = (videoUrl: string, value: TrimValue | null) => {
    saveTrim(videoUrl, value).catch((err) => setThumbnailError(err instanceof Error ? err.message : "Kürzen fehlgeschlagen."));
  };
  const uploadedRef = useRef<string | null>(null);

  const saveThumbnail = (videoUrl: string, image: Blob) => {
    setThumbnailError(null);
    uploadThumbnail(videoUrl, image).catch((err) => setThumbnailError(err instanceof Error ? err.message : "Titelbild fehlgeschlagen."));
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    onUploadStateChange?.({ uploading: status === "uploading", uploadedUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onUploadStateChange is expected to be a stable callback from the parent
  }, [status, uploadedUrl]);

  function open(useCamera: boolean) {
    const input = inputRef.current;
    if (!input) return;
    if (useCamera) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadedUrl(null);
    uploadedRef.current = null;
    thumbnailRef.current = null;
    trimRef.current = null;
    setTrim(null);
    setThumbnailError(null);
    setThumbnail((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setError(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    if (!file) {
      setStatus("idle");
      return;
    }

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setStatus("error");
      setError("Erlaubt: MP4, WEBM oder MOV.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setStatus("error");
      setError("Video darf maximal 200 MB groß sein.");
      return;
    }

    setStatus("uploading");
    try {
      const prepareRes = await fetch("/api/upload/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, contentType: file.type }),
      });
      const prepared = await prepareRes.json();
      if (!prepareRes.ok) throw new Error(prepared.error ?? "Upload fehlgeschlagen.");

      const putRes = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload fehlgeschlagen.");

      setUploadedUrl(prepared.publicUrl);
      uploadedRef.current = prepared.publicUrl;
      if (thumbnailRef.current) saveThumbnail(prepared.publicUrl, thumbnailRef.current);
      if (trimRef.current) persistTrim(prepared.publicUrl, trimRef.current);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    }
  }

  return (
    <div className="mb-3">
      <input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleChange} />
      <input type="hidden" name={urlFieldName} value={uploadedUrl ?? ""} />

      {previewUrl && (
        <div className="relative mb-2">
          <video
            src={previewUrl}
            className="max-h-80 w-full rounded-lg bg-black object-contain"
            controls
            autoPlay
            loop
            muted
            playsInline
          />
          {status === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
              <p className="rounded-full bg-black/70 px-3 py-1.5 text-sm text-white">Wird hochgeladen…</p>
            </div>
          )}
        </div>
      )}

      {previewUrl && withThumbnail && status !== "error" && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau
            <img src={thumbnail.url} alt="" className="h-12 w-9 rounded object-cover" />
          ) : (
            <span className="flex h-12 w-9 items-center justify-center rounded bg-zinc-900 text-zinc-500">
              <ImageIcon size={16} />
            </span>
          )}
          <span className="flex-1 text-sm text-zinc-300">
            Titelbild fürs Profil
            <span className="block text-xs text-zinc-500">{thumbnail ? "Gewählt" : "Sonst das erste Bild des Videos"}</span>
          </span>
          <button type="button" onClick={() => setThumbnailOpen(true)} className="text-sm font-bold text-orange-500 hover:underline">
            {thumbnail ? "Ändern" : "Wählen"}
          </button>
        </div>
      )}
      {previewUrl && withThumbnail && status !== "error" && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-zinc-900 text-zinc-400">
            <Scissors size={16} />
          </span>
          <span className="flex-1 text-sm text-zinc-300">
            Video kürzen
            <span className="block text-xs text-zinc-500">
              {trim ? `${(trim.startMs / 1000).toFixed(1)} s bis ${trim.endMs ? `${(trim.endMs / 1000).toFixed(1)} s` : "Ende"}` : "Ganzes Video"}
            </span>
          </span>
          <button type="button" onClick={() => setTrimOpen(true)} className="text-sm font-bold text-orange-500 hover:underline">
            {trim ? "Ändern" : "Kürzen"}
          </button>
        </div>
      )}
      {trimOpen && previewUrl && (
        <TrimEditor
          src={previewUrl}
          initial={trim}
          onClose={() => setTrimOpen(false)}
          onDone={(value) => {
            setTrim(value);
            trimRef.current = value;
            if (uploadedRef.current) persistTrim(uploadedRef.current, value);
          }}
        />
      )}
      {thumbnailError && <p className="mb-2 text-sm text-red-400">{thumbnailError}</p>}
      {thumbnailOpen && previewUrl && (
        <ThumbnailEditor
          src={previewUrl}
          onClose={() => setThumbnailOpen(false)}
          onPicked={(blob) => {
            setThumbnail((prev) => {
              if (prev) URL.revokeObjectURL(prev.url);
              return { url: URL.createObjectURL(blob), blob };
            });
            thumbnailRef.current = blob;
            if (uploadedRef.current) saveThumbnail(uploadedRef.current, blob);
          }}
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => open(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-orange-400 hover:text-orange-400"
        >
          <Camera size={16} /> {previewUrl ? "Neu filmen" : "Jetzt filmen"}
        </button>
        <button
          type="button"
          onClick={() => open(false)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-orange-400 hover:text-orange-400"
        >
          <FolderOpen size={16} /> {previewUrl ? "Anderes Video" : "Datei wählen"}
        </button>
      </div>
      {!previewUrl && <p className="mt-1.5 text-xs text-zinc-500">Keine Datei ausgewählt</p>}
      {status === "done" && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-green-500">
          <Check size={13} /> Hochgeladen
        </p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
