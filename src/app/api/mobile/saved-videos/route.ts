import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { apiError } from "@/lib/api-error";
import { getSavedFeedItems, saveVideo, unsaveVideo, type SavedTarget } from "@/lib/saved-videos";

// Luca 16.11. (Phasen-Map 3.1): „Für später“. GET = gemerkte Videos als Feed-Karten,
// POST `{ targetType: "pitch" | "battle", targetId }` = merken, DELETE (gleicher Body) = entfernen.

function parseTarget(body: Record<string, unknown>): SavedTarget | null {
  const targetType = body.targetType === "battle" ? "battle" : body.targetType === "pitch" ? "pitch" : null;
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  return targetType && isUuid(targetId) ? { targetType, targetId } : null;
}

export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  return NextResponse.json({ items: await getSavedFeedItems(viewer.id) });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const target = parseTarget(await readJsonBody(request));
  if (!target) return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  if (!(await saveVideo(viewer.id, target))) return await apiError({ error: "Video nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const target = parseTarget(await readJsonBody(request));
  if (!target) return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  await unsaveVideo(viewer.id, target);
  return NextResponse.json({ ok: true, saved: false });
}
