import "server-only";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { videoThumbnails } from "@/db/schema";
import { isOwnVideoUrl, uploadImage } from "@/lib/storage";
import { VIDEO_UPLOAD_FOLDERS } from "@/lib/video-constants";

// Luca 24.10.: Titelbilder nur für die Profil-Kacheln (im Feed läuft gleich das Video).

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** JPEG/PNG/WEBP bis 5 MB — für Titelbilder und Banner (kein SVG: das sind Fotos). */
export function photoError(file: File, label: string): string | null {
  if (file.size === 0) return `${label} fehlt.`;
  if (file.size > MAX_PHOTO_BYTES) return `${label} darf maximal 5 MB groß sein.`;
  if (!PHOTO_TYPES.includes(file.type)) return "Erlaubt: JPEG, PNG oder WEBP.";
  return null;
}

/** Titelbild-Adresse je Video-Adresse (nur Videos, die eins haben). */
export async function getThumbnailMap(videoUrls: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(videoUrls.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ videoUrl: videoThumbnails.videoUrl, imageUrl: videoThumbnails.imageUrl })
    .from(videoThumbnails)
    .where(inArray(videoThumbnails.videoUrl, unique));
  return new Map(rows.map((r) => [r.videoUrl, r.imageUrl]));
}

/** Nur eigene Videos (Upload-Pfad enthält die eigene Nutzer-ID). */
export async function setVideoThumbnail(
  userId: string,
  videoUrl: string,
  image: File,
): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string }> {
  if (!VIDEO_UPLOAD_FOLDERS.some((folder) => isOwnVideoUrl(videoUrl, folder, userId))) {
    return { ok: false, error: "Das ist nicht dein Video." };
  }
  const invalid = photoError(image, "Titelbild");
  if (invalid) return { ok: false, error: invalid };
  const { url } = await uploadImage(image, `thumbnails/${userId}`);
  await db
    .insert(videoThumbnails)
    .values({ videoUrl, imageUrl: url, userId })
    .onConflictDoUpdate({ target: videoThumbnails.videoUrl, set: { imageUrl: url, updatedAt: sql`now()` } });
  return { ok: true, imageUrl: url };
}
