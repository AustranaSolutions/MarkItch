import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { postReactionFor } from "@/lib/reaction-manage";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5c: Reaktion (oder Antwort auf eine Reaktion) aus der App posten —
// gleiche Logik wie die Web-Action postReaction. Das Video liegt schon im
// Speicher (Direkt-Upload in reaction-videos). Liste/Likes/Kommentare nutzen
// die bestehenden /api/pitches/{reactions,like,reaction-comments}.
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const soloPitchId = text(body.soloPitchId);
  const parentReactionId = text(body.parentReactionId);
  if (!isUuid(soloPitchId) || (parentReactionId && !isUuid(parentReactionId))) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const form = new FormData();
  form.set("soloPitchId", soloPitchId);
  if (parentReactionId) form.set("parentReactionId", parentReactionId);
  form.set("videoUrl", text(body.videoUrl));
  if (body.audioRightsConfirmed === true) form.set("audioRightsConfirmed", "on");
  if (body.containsAiContent === true) form.set("containsAiContent", "on");

  const result = await postReactionFor(viewer, form);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
