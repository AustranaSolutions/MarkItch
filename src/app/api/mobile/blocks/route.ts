import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { blockBrandFor, blockUserFor, listBlocksFor, unblockBrandFor, unblockUserFor } from "@/lib/block";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-7: Blockieren (App-Store-Richtlinie 1.2). Body `{ brandId }` (ganze
// Marke, z. B. vom Profil oder einer Video-Karte) oder `{ userId }`
// (z. B. Verfasser eines Kommentars).

export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  return NextResponse.json({ blocks: await listBlocksFor(viewer.id) });
}

async function target(request: NextRequest) {
  const body = await readJsonBody(request);
  if (typeof body.brandId === "string" && isUuid(body.brandId)) return { brandId: body.brandId };
  if (typeof body.userId === "string" && isUuid(body.userId)) return { userId: body.userId };
  return null;
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const t = await target(request);
  if (!t) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const result = t.brandId ? await blockBrandFor(viewer.id, t.brandId) : await blockUserFor(viewer.id, t.userId!);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const t = await target(request);
  if (!t) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  if (t.brandId) await unblockBrandFor(viewer.id, t.brandId);
  else await unblockUserFor(viewer.id, t.userId!);
  return NextResponse.json({ ok: true });
}
