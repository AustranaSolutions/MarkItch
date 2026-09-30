import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { soloPitches } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { effectiveStatus, getIncomingChallenges, getOutgoingChallenges, type ChallengeWithBrand } from "@/lib/challenge";
import { sendChallengeFor, sendChallengeFromSoloPitchFor } from "@/lib/challenge-manage";
import { getBattlesAwaitingVideoFrom } from "@/lib/upcoming-battles";
import { DUEL_CATEGORIES } from "@/lib/battle-format";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5b: Duell-Einladungen der eigenen Marke (Gegenstück zu
// /profile/settings#einladungen) + Duelle, bei denen das eigene Video fehlt
// (Hinweis im „+“-Tab), und Einladung senden.

function toJson(c: ChallengeWithBrand, pitchById: Map<string, { id: string; description: string | null }>) {
  return {
    id: c.id,
    category: c.category,
    status: effectiveStatus(c),
    expiresAt: c.expiresAt.toISOString(),
    otherBrand: c.otherBrand,
    battleId: c.battleId,
    // RN-7: Einladung auf einen Solo-Pitch → der Pitch ist die Duell-Seite der eingeladenen Marke.
    soloPitch: c.soloPitchId ? (pitchById.get(c.soloPitchId) ?? null) : null,
    // Nur DASS das Video der einladenden Marke da ist — nie die Adresse (bleibt verdeckt).
    hasChallengerVideo: Boolean(c.challengerVideoUrl),
  };
}

export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const brand = await getBrandForUser(viewer.id);
  if (!brand) {
    return NextResponse.json({ incoming: [], outgoing: [], awaitingMyVideo: [], categories: DUEL_CATEGORIES });
  }
  const [incoming, outgoing, awaiting] = await Promise.all([
    getIncomingChallenges(brand.id),
    getOutgoingChallenges(brand.id),
    getBattlesAwaitingVideoFrom(brand.id),
  ]);
  const pitchIds = [...incoming, ...outgoing].map((c) => c.soloPitchId).filter((id): id is string => Boolean(id));
  const pitchRows = pitchIds.length
    ? await db.select({ id: soloPitches.id, description: soloPitches.description }).from(soloPitches).where(inArray(soloPitches.id, pitchIds))
    : [];
  const pitchById = new Map(pitchRows.map((p) => [p.id, p]));
  return NextResponse.json({
    incoming: incoming.map((c) => toJson(c, pitchById)),
    outgoing: outgoing.map((c) => toJson(c, pitchById)),
    awaitingMyVideo: awaiting.map((b) => {
      const opponent = b.brandAId === brand.id ? b.brandB : b.brandA;
      return { battleId: b.id, opponentName: opponent.name };
    }),
    categories: DUEL_CATEGORIES,
  });
}

/**
 * Body: `{ category, challengedBrandId }` (vom Profil) oder `{ category, soloPitchId }` (von einem Solo-Pitch),
 * optional mit eigenem Duell-Video: `videoUrl, ctaLabel, ctaUrl, audioRightsConfirmed, containsAiContent` (RN-7).
 */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  const targetId = body.soloPitchId ?? body.challengedBrandId;
  if (typeof targetId !== "string" || !isUuid(targetId)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  let video: FormData | null = null;
  if (typeof body.videoUrl === "string" && body.videoUrl) {
    const text = (value: unknown) => (typeof value === "string" ? value : "");
    video = new FormData();
    video.set("videoUrl", body.videoUrl);
    video.set("ctaLabel", text(body.ctaLabel));
    video.set("ctaUrl", text(body.ctaUrl));
    if (body.audioRightsConfirmed === true) video.set("audioRightsConfirmed", "on");
    if (body.containsAiContent === true) video.set("containsAiContent", "on");
  }
  const result = body.soloPitchId
    ? await sendChallengeFromSoloPitchFor(viewer, { soloPitchId: body.soloPitchId, category: body.category, video })
    : await sendChallengeFor(viewer, { challengedBrandId: body.challengedBrandId, category: body.category, video });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
