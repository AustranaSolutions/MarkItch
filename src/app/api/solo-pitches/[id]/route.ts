import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { deleteOwnSoloPitch, updateOwnSoloPitch } from "@/lib/solo-pitch";

// RN-3: Bearbeiten/Löschen eigener Solo-Pitches aus der App — gleiche Logik
// wie die Web-Actions updateSoloPitch/deleteSoloPitch (lib/solo-pitch.ts).

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = await updateOwnSoloPitch(viewer.id, id, {
    description: body?.description,
    ctaLabel: body?.ctaLabel,
    ctaUrl: body?.ctaUrl,
    containsAiContent: typeof body?.containsAiContent === "boolean" ? body.containsAiContent : undefined,
  });
  if (!result.ok) {
    const first = Object.values(result.errors).find((messages) => messages?.length)?.[0];
    return NextResponse.json({ error: first ?? "Ungültige Eingabe.", fieldErrors: result.errors }, { status: 400 });
  }
  return NextResponse.json({
    description: result.description,
    ctaLabel: result.ctaLabel,
    ctaUrl: result.ctaUrl,
    containsAiContent: result.containsAiContent,
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }
  const { id } = await params;
  const result = await deleteOwnSoloPitch(viewer.id, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
