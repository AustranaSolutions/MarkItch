import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { castVoteForUser, getVoteTally, publicTally } from "@/lib/vote";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  // Phase 14: per-IP, not per-user — the unique index on (battleId, userId)
  // already stops one account voting twice on the same Duell; this catches
  // a script spinning through many accounts from the same place instead.
  const { allowed } = await checkRateLimit("vote", await getClientIp(request));
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const battleId = body?.battleId;
  const votedForBrandId = body?.votedForBrandId;
  if (typeof battleId !== "string" || typeof votedForBrandId !== "string" || !battleId || !votedForBrandId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = await castVoteForUser(viewer.id, battleId, votedForBrandId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId)).limit(1);
  const tally = battle ? await getVoteTally(battle.id, battle.brandAId, battle.brandBId) : null;
  // Blind bis Fristende: nur die Gesamtzahl zurückgeben (siehe publicTally).
  const isFinished = Boolean(battle?.votingEndsAt && battle.votingEndsAt <= new Date());
  return NextResponse.json({ tally: tally ? publicTally(tally, isFinished) : null, votedForBrandId });
}
