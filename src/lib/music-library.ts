import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { videoMusic } from "@/db/schema";
import { isOwnVideoUrl } from "@/lib/storage";
import { VIDEO_UPLOAD_FOLDERS } from "@/lib/video-constants";
import { MUSIC_TRACKS } from "@/lib/music-tracks";

// Luca 05.11.: MarkItch-Musikbibliothek — eigene Titel (GarageBand), die Marken
// unter ihre Videos legen und herunterladen dürfen. Gespeichert wird nur die
// Auswahl pro Video (wie die Kürzung), App und Web spielen den Titel in
// Schleife mit. Die Dateien liegen statisch unter public/music/.

/** Was ein Video an Musik hat — `url` gleich mit, damit App/Web nichts nachschlagen müssen. */
export type VideoMusic = { trackId: string; title: string; url: string; musicVolume: number; originalVolume: number };

const trackById = new Map(MUSIC_TRACKS.map((t) => [t.id, t]));

export async function getMusicMap(videoUrls: string[]): Promise<Map<string, VideoMusic>> {
  const unique = [...new Set(videoUrls.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await db.select().from(videoMusic).where(inArray(videoMusic.videoUrl, unique));
  const map = new Map<string, VideoMusic>();
  for (const r of rows) {
    const track = trackById.get(r.trackId);
    // Titel aus der Bibliothek entfernt → Video läuft wieder mit Originalton.
    if (!track) continue;
    map.set(r.videoUrl, { trackId: track.id, title: track.title, url: track.url, musicVolume: r.musicVolume, originalVolume: r.originalVolume });
  }
  return map;
}

const percent = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;

/** Nur eigene Videos. `trackId: null` = Musik entfernen (Originalton wie aufgenommen). */
export async function setVideoMusic(
  userId: string,
  videoUrl: string,
  input: { trackId: unknown; musicVolume: unknown; originalVolume: unknown },
): Promise<{ ok: true; music: VideoMusic | null } | { ok: false; error: string }> {
  if (!VIDEO_UPLOAD_FOLDERS.some((folder) => isOwnVideoUrl(videoUrl, folder, userId))) {
    return { ok: false, error: "Das ist nicht dein Video." };
  }
  if (input.trackId === null || input.trackId === undefined || input.trackId === "") {
    await db.delete(videoMusic).where(and(eq(videoMusic.videoUrl, videoUrl), eq(videoMusic.userId, userId)));
    return { ok: true, music: null };
  }
  const track = typeof input.trackId === "string" ? trackById.get(input.trackId) : undefined;
  if (!track) return { ok: false, error: "Diesen Titel gibt es nicht." };
  const musicVolume = percent(input.musicVolume, 80);
  const originalVolume = percent(input.originalVolume, 100);
  await db
    .insert(videoMusic)
    .values({ videoUrl, userId, trackId: track.id, musicVolume, originalVolume })
    .onConflictDoUpdate({ target: videoMusic.videoUrl, set: { trackId: track.id, musicVolume, originalVolume, updatedAt: new Date() } });
  return { ok: true, music: { trackId: track.id, title: track.title, url: track.url, musicVolume, originalVolume } };
}
