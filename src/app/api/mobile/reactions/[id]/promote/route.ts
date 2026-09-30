import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { promoteReactionFor } from "@/lib/reaction-manage";
import { isUuid, unauthorized } from "@/lib/mobile-auth";

// RN-5c: „Zum Duell hochstufen“ — die Marke des Original-Pitches macht aus einer Reaktion ein Duell.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const result = await promoteReactionFor(viewer, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ battleId: result.battleId });
}
