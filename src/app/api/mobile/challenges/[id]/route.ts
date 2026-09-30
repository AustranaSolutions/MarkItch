import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { cancelChallengeFor, respondToChallengeFor } from "@/lib/challenge-manage";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5b: auf eine Einladung reagieren — `{ action: "accept" | "decline" }`
// (eingeladene Marke) oder `{ action: "cancel" }` (einladende Marke).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const { action } = await readJsonBody(request);
  const result =
    action === "cancel" ? await cancelChallengeFor(viewer, id) : await respondToChallengeFor(viewer, id, action);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, battleId: result.battleId ?? null });
}
