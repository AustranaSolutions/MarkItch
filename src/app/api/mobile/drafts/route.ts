import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { deleteDraft, listDrafts, saveDraft } from "@/lib/drafts";

// Luca 25.10.: Entwürfe (App und Web, Web per Cookie). GET = Liste, POST = anlegen/ändern
// (`id` mitschicken zum Ändern), DELETE `{ id }`.

export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  return NextResponse.json({ drafts: await listDrafts(viewer.id) });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const result = await saveDraft(viewer.id, await readJsonBody(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ draft: result.draft });
}

export async function DELETE(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  if (typeof body.id === "string") await deleteDraft(viewer.id, body.id);
  return NextResponse.json({ ok: true });
}
