import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { submitBattleVideoFor } from "@/lib/battle-video";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5b: eigenes Duell-Video einreichen — gleiche Logik wie die Web-Action
// uploadBattleVideo. Das Video liegt schon im Speicher (Direkt-Upload in den
// Ordner battle-videos), hier kommt nur die URL an.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const body = await readJsonBody(request);
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const form = new FormData();
  form.set("videoUrl", text(body.videoUrl));
  form.set("ctaLabel", text(body.ctaLabel));
  form.set("ctaUrl", text(body.ctaUrl));
  if (body.audioRightsConfirmed === true) form.set("audioRightsConfirmed", "on");
  if (body.containsAiContent === true) form.set("containsAiContent", "on");

  const result = await submitBattleVideoFor(viewer, id, form);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
