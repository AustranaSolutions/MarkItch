"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, FolderOpen } from "lucide-react";
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
}: {
  folder: VideoUploadFolder;
  urlFieldName?: string;
  onUploadStateChange?: (state: { uploading: boolean; uploadedUrl: string | null }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
