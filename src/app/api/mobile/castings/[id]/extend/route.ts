import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { extendCastingFor } from "@/lib/casting-manage";
import { apiError } from "@/lib/api-error";

// Luca 18.11.: Marke verlängert die Einreichfrist ihres Castings. Body `{ days: 7 | 14 }`.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  const { days } = await readJsonBody(request);
  const result = await extendCastingFor(viewer, id, days);
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
