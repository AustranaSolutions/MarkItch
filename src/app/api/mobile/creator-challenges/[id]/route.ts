import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { deleteChallengeFor, getChallengeDetails } from "@/lib/creator-challenge";
import { isUuid, unauthorized } from "@/lib/mobile-auth";

// RN-7: eine Creator-Challenge mit Rangliste (Einreichungen als Feed-Karten, meiste Likes zuerst).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getOptionalUser();
  const details = isUuid(id) ? await getChallengeDetails(id, viewer?.id ?? null) : null;
  if (!details) return NextResponse.json({ error: "Diese Challenge gibt es nicht." }, { status: 404 });
  return NextResponse.json({
    id: details.challenge.id,
    prompt: details.challenge.prompt,
    period: details.challenge.period,
    periodLabel: details.periodLabel,
    stage: details.stage,
    brand: details.brand,
    entries: details.entries,
    isOwner: details.isOwner,
    canSubmit: details.canSubmit,
    viewerSubmitted: details.viewerSubmitted,
  });
}

/** RN-7: eigene Challenge löschen (nur die Marke selbst). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const result = await deleteChallengeFor(viewer, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ ok: true });
}
