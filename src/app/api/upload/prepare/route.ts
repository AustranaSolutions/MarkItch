import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { createVideoUploadTarget } from "@/lib/storage";
import { ALLOWED_VIDEO_TYPES, VIDEO_UPLOAD_FOLDERS, type VideoUploadFolder } from "@/lib/video-constants";
import { apiError } from "@/lib/api-error";

/**
 * Phase 29: step 1 of the direct-to-storage upload flow (see storage.ts's
 * comment on createVideoUploadTarget for why this exists at all). Returns
 * where the browser should PUT/POST the file bytes, and what the resulting
 * public URL will be — this route itself never sees the file.
 */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const folder = body?.folder;
  const contentType = body?.contentType;

  if (typeof folder !== "string" || !VIDEO_UPLOAD_FOLDERS.includes(folder as VideoUploadFolder)) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (typeof contentType !== "string" || !ALLOWED_VIDEO_TYPES.includes(contentType)) {
    return await apiError({ error: "Erlaubt: MP4, WEBM oder MOV." }, { status: 400 });
  }

  // Audit 04.10. (H5): jede Adresse kann eine Datei im Speicher hinterlassen.
  const { allowed } = await checkRateLimit("upload-prepare", viewer.id);
  if (!allowed) return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  const daily = await checkRateLimit("upload-prepare-day", viewer.id);
  if (!daily.allowed) return await apiError({ error: "Tageslimit für Uploads erreicht — morgen geht es weiter." }, { status: 429 });

  try {
    const target = await createVideoUploadTarget(folder as VideoUploadFolder, contentType, viewer.id);
    return NextResponse.json(target);
  } catch (err) {
    console.error("[upload/prepare]", err);
    return await apiError({ error: "Upload konnte nicht vorbereitet werden." }, { status: 500 });
  }
}
