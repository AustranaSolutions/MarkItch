import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { setVideoTrim } from "@/lib/video-trims";

/** Luca 25.10.: Video kürzen — `{ videoUrl, startMs, endMs }` (endMs null = bis zum Ende). App und Web. */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  if (typeof body.videoUrl !== "string") return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const result = await setVideoTrim(viewer.id, body.videoUrl, body.startMs, body.endMs);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ trim: result.trim });
}
