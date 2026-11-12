import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { deleteOwnReactionFor, updateOwnReactionFor } from "@/lib/reaction-manage";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { apiError } from "@/lib/api-error";

/** Luca 02.11.: eigene Reaktion löschen (App und Web). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return await apiError({ error: "Nicht gefunden." }, { status: 404 });
  const result = await deleteOwnReactionFor(viewer, id);
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Luca 02.11.: eigene Reaktion bearbeiten — `{ containsAiContent }`. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return await apiError({ error: "Nicht gefunden." }, { status: 404 });
  const result = await updateOwnReactionFor(viewer, id, await readJsonBody(request));
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
