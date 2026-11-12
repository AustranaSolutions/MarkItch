import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { MUSIC_TRACKS } from "@/lib/music-tracks";
import { setVideoMusic } from "@/lib/music-library";
import { apiError } from "@/lib/api-error";

/** Luca 05.11.: Titel der MarkItch-Musikbibliothek. */
export async function GET() {
  return NextResponse.json({ tracks: MUSIC_TRACKS });
}

/** Musik für ein eigenes Video setzen (`trackId: null` = entfernen) — App und Web. */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  if (typeof body.videoUrl !== "string") return await apiError({ error: "Video fehlt." }, { status: 400 });
  const result = await setVideoMusic(viewer.id, body.videoUrl, {
    trackId: body.trackId,
    musicVolume: body.musicVolume,
    originalVolume: body.originalVolume,
  });
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json({ music: result.music });
}
