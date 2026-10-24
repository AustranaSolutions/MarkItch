import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { unauthorized } from "@/lib/mobile-auth";
import { setVideoThumbnail } from "@/lib/video-thumbnails";

/** Luca 24.10.: Titelbild für ein eigenes Video setzen — multipart `videoUrl` + `image`. */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const form = await request.formData().catch(() => null);
  const videoUrl = form?.get("videoUrl");
  const image = form?.get("image");
  if (typeof videoUrl !== "string" || !(image instanceof File)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const result = await setVideoThumbnail(viewer.id, videoUrl, image);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ thumbnailUrl: result.imageUrl });
}
