import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getFeedDuelById, getFeedSoloPitchById } from "@/lib/feed";

// RN-5: ein einzelnes Duell/Solo-Pitch als Feed-Karte — Gegenstück zu
// `/?battle=` bzw. `/?pitch=` im Web (Benachrichtigungen, Trending, geteilte Links).
export async function GET(request: NextRequest) {
  const viewer = await getOptionalUser();
  const battleId = request.nextUrl.searchParams.get("battle");
  const pitchId = request.nextUrl.searchParams.get("pitch");
  const item = battleId
    ? await getFeedDuelById(viewer?.id ?? null, battleId)
    : pitchId
      ? await getFeedSoloPitchById(viewer?.id ?? null, pitchId)
      : null;
  if (!item) return NextResponse.json({ error: "Nicht mehr verfügbar." }, { status: 404 });
  return NextResponse.json({ item });
}
