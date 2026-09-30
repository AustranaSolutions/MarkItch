import { NextRequest, NextResponse } from "next/server";
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

function toJson(c: ChallengeWithBrand) {
  return {
    id: c.id,
    category: c.category,
    status: effectiveStatus(c),
    expiresAt: c.expiresAt.toISOString(),
    otherBrand: c.otherBrand,
    battleId: c.battleId,
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
  return NextResponse.json({
    incoming: incoming.map(toJson),
    outgoing: outgoing.map(toJson),
    awaitingMyVideo: awaiting.map((b) => {
      const opponent = b.brandAId === brand.id ? b.brandB : b.brandA;
      return { battleId: b.id, opponentName: opponent.name };
    }),
    categories: DUEL_CATEGORIES,
  });
}

/** Body: `{ category, challengedBrandId }` (vom Profil) oder `{ category, soloPitchId }` (von einem Solo-Pitch). */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  const targetId = body.soloPitchId ?? body.challengedBrandId;
  if (typeof targetId !== "string" || !isUuid(targetId)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const result = body.soloPitchId
    ? await sendChallengeFromSoloPitchFor(viewer, { soloPitchId: body.soloPitchId, category: body.category })
    : await sendChallengeFor(viewer, { challengedBrandId: body.challengedBrandId, category: body.category });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
