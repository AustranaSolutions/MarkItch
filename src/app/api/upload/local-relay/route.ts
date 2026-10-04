import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { writeLocalUpload } from "@/lib/storage";
import { MAX_VIDEO_BYTES } from "@/lib/video-constants";

/**
 * Phase 29: dev-only counterpart to Supabase's signed upload URL (see
 * storage.ts) — local disk has no equivalent "direct browser upload"
 * mechanism, so this plain Route Handler relays the bytes instead. Never
 * used in production (createVideoUploadTarget only ever returns this URL
 * when Supabase isn't configured), so Vercel's platform body-size limit
 * that made the old Server-Action approach fail is a non-issue here.
 */
export async function PUT(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const key = request.nextUrl.searchParams.get("key");
  // Only ever a key this same app just generated (randomUUID-based, see
  // createVideoUploadTarget) — reject anything that looks like it's trying
  // to escape the uploads directory.
  // Audit 04.10. (M5): nur in den eigenen Ordner (<folder>/<userId>/…).
  if (!key || key.includes("..") || key.startsWith("/") || key.split("/")[1] !== viewer.id) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "Ungültige Dateigröße." }, { status: 400 });
  }

  await writeLocalUpload(key, bytes);
  return NextResponse.json({ ok: true });
}
