import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { castGuestVote, castVoteForUser, getVoteTally, publicTally } from "@/lib/vote";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  const body = await request.json().catch(() => null);
  // Luca 13.11. (Phase 5): ohne Konto mit Geräte-Kennung (`guestId`) abstimmen.
  const isGuest = !viewer;
  if (isGuest && typeof body?.guestId !== "string") {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  // Phase 14: per-IP, not per-user — the unique index on (battleId, userId)
  // already stops one account voting twice on the same Duell; this catches
  // a script spinning through many accounts from the same place instead.
  const { allowed } = await checkRateLimit(isGuest ? "guest-vote" : "vote", await getClientIp(request));
  if (!allowed) {
    return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const battleId = body?.battleId;
  const votedForBrandId = body?.votedForBrandId;
  if (typeof battleId !== "string" || typeof votedForBrandId !== "string" || !battleId || !votedForBrandId) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = viewer ? await castVoteForUser(viewer.id, battleId, votedForBrandId) : await castGuestVote(body.guestId, battleId, votedForBrandId);
  if (result.error) {
    return await apiError({ error: result.error }, { status: 400 });
  }

  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId)).limit(1);
  const tally = battle ? await getVoteTally(battle.id, battle.brandAId, battle.brandBId) : null;
  // Blind bis Fristende: nur die Gesamtzahl zurückgeben (siehe publicTally).
  const isFinished = Boolean(battle?.votingEndsAt && battle.votingEndsAt <= new Date());
  return NextResponse.json({ tally: tally ? publicTally(tally, isFinished) : null, votedForBrandId, guest: isGuest });
}
