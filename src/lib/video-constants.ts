// Client-safe (no "server-only") — shared between the browser-side upload
// flow (video-picker-input.tsx) and every server action that still double-
// checks these before trusting a client-supplied videoUrl.
export const VIDEO_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export const ALLOWED_VIDEO_TYPES = Object.keys(VIDEO_EXTENSION_BY_MIME_TYPE);

// Luca 02.11.: Videos max. 1 Minute (vorher 3) — schneller hochgeladen und geladen,
// weniger Speicher. App: iOS schneidet beim Auswählen zu, Kamera stoppt nach 60 s;
// Web: prüft die Länge vor dem Hochladen. 100 MB reichen für 1 Minute auch unverkleinert.
export const MAX_VIDEO_SECONDS = 60;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// Phase 29: every place a video gets uploaded to, one flat whitelist so the
// upload-target API route can validate a requested folder instead of
// trusting an arbitrary client-supplied path.
export const VIDEO_UPLOAD_FOLDERS = [
  "solo-pitch-videos",
  "battle-videos",
  "reaction-videos",
  "casting-videos",
  "creator-videos",
  "videos", // brand profile showcase video — named "videos" from Phase 3, before the others existed
] as const;
export type VideoUploadFolder = (typeof VIDEO_UPLOAD_FOLDERS)[number];
