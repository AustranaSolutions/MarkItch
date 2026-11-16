import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { apiError } from "@/lib/api-error";
import { hideContent, unhideContent, type HiddenTarget } from "@/lib/hidden-content";

// Luca 16.11. (Phasen-Map 3.2): „Nicht interessiert“. POST `{ targetType, targetId }`
// blendet aus, DELETE (gleicher Body) macht es rückgängig.

function parseTarget(body: Record<string, unknown>): HiddenTarget | null {
  const targetType = body.targetType === "battle" ? "battle" : body.targetType === "pitch" ? "pitch" : null;
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  return targetType && isUuid(targetId) ? { targetType, targetId } : null;
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const target = parseTarget(await readJsonBody(request));
  if (!target) return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  if (!(await hideContent(viewer.id, target))) return await apiError({ error: "Video nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const target = parseTarget(await readJsonBody(request));
  if (!target) return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  await unhideContent(viewer.id, target);
  return NextResponse.json({ ok: true });
}
