import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { videoTrims } from "@/db/schema";
import { isOwnVideoUrl } from "@/lib/storage";
import { VIDEO_UPLOAD_FOLDERS } from "@/lib/video-constants";

// Luca 25.10.: Video kürzen ohne Neuberechnen — gespeichert wird nur Anfang/Ende,
// App und Web spielen dann nur diesen Ausschnitt (Schleife, Spulleiste, Dauer).
// Pro Video-Adresse wie die Titelbilder (lib/video-thumbnails.ts).

export type VideoTrim = { startMs: number; endMs: number | null };

/** Kürzer als das wird ein Ausschnitt nicht (sonst ist das Video praktisch weg). */
export const MIN_TRIM_MS = 1000;

export async function getTrimMap(videoUrls: string[]): Promise<Map<string, VideoTrim>> {
  const unique = [...new Set(videoUrls.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ videoUrl: videoTrims.videoUrl, startMs: videoTrims.startMs, endMs: videoTrims.endMs })
    .from(videoTrims)
    .where(inArray(videoTrims.videoUrl, unique));
  return new Map(rows.map((r) => [r.videoUrl, { startMs: r.startMs, endMs: r.endMs }]));
}

/** Nur eigene Videos. `endMs: null` = bis zum Ende; 0 bis Ende = Kürzung entfernen. */
export async function setVideoTrim(
  userId: string,
  videoUrl: string,
  rawStart: unknown,
  rawEnd: unknown,
): Promise<{ ok: true; trim: VideoTrim | null } | { ok: false; error: string }> {
  if (!VIDEO_UPLOAD_FOLDERS.some((folder) => isOwnVideoUrl(videoUrl, folder, userId))) {
    return { ok: false, error: "Das ist nicht dein Video." };
  }
  const startMs = typeof rawStart === "number" && Number.isFinite(rawStart) ? Math.max(0, Math.round(rawStart)) : 0;
  const endMs = typeof rawEnd === "number" && Number.isFinite(rawEnd) ? Math.round(rawEnd) : null;
  if (endMs !== null && endMs - startMs < MIN_TRIM_MS) return { ok: false, error: "Der Ausschnitt muss mindestens 1 Sekunde lang sein." };

  if (startMs === 0 && endMs === null) {
    await db.delete(videoTrims).where(and(eq(videoTrims.videoUrl, videoUrl), eq(videoTrims.userId, userId)));
    return { ok: true, trim: null };
  }
  await db
    .insert(videoTrims)
    .values({ videoUrl, userId, startMs, endMs })
    .onConflictDoUpdate({ target: videoTrims.videoUrl, set: { startMs, endMs, updatedAt: new Date() } });
  return { ok: true, trim: { startMs, endMs } };
}
