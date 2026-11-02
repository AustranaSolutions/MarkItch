import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { deleteOwnReactionFor } from "@/lib/reaction-manage";
import { isUuid, unauthorized } from "@/lib/mobile-auth";

/** Luca 02.11.: eigene Reaktion löschen (App und Web). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const result = await deleteOwnReactionFor(viewer, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
