import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { deleteSavedCode, listSavedCodes, saveCode } from "@/lib/saved-codes";

// Luca 13.11. (Phase 3): „Meine Codes“. GET = Liste, POST `{ targetType, targetId, brandId }`
// = Code dieses Videos speichern (beim Antippen des Link-Knopfs), DELETE `{ id }`.

export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  return NextResponse.json({ codes: await listSavedCodes(viewer.id) });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  return NextResponse.json(await saveCode(viewer.id, await readJsonBody(request)));
}

export async function DELETE(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  await deleteSavedCode(viewer.id, body.id);
  return NextResponse.json({ ok: true });
}
