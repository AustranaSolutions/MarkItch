import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { startCastingFor } from "@/lib/casting-manage";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5d: Partner-Casting starten — gleiche Logik wie die Web-Action startCasting.
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { prompt } = await readJsonBody(request);
  const result = await startCastingFor(viewer, prompt);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ castingId: result.castingId }, { status: 201 });
}
