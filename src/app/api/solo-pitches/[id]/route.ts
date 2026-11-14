import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { deleteOwnSoloPitch, updateOwnSoloPitch } from "@/lib/solo-pitch";
import { apiError } from "@/lib/api-error";

// RN-3: Bearbeiten/Löschen eigener Solo-Pitches aus der App — gleiche Logik
// wie die Web-Actions updateSoloPitch/deleteSoloPitch (lib/solo-pitch.ts).

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = await updateOwnSoloPitch(viewer.id, id, {
    description: body?.description,
    ctaLabel: body?.ctaLabel,
    ctaUrl: body?.ctaUrl,
    ctaCode: body?.ctaCode,
    containsAiContent: typeof body?.containsAiContent === "boolean" ? body.containsAiContent : undefined,
    paidPartnership: typeof body?.paidPartnership === "boolean" ? body.paidPartnership : undefined,
  });
  if (!result.ok) {
    const first = Object.values(result.errors).find((messages) => messages?.length)?.[0];
    return await apiError({ error: first ?? "Ungültige Eingabe.", fieldErrors: result.errors }, { status: 400 });
  }
  return NextResponse.json({
    description: result.description,
    ctaLabel: result.ctaLabel,
    ctaUrl: result.ctaUrl,
    ctaCode: result.ctaCode,
    containsAiContent: result.containsAiContent,
    paidPartnership: result.paidPartnership,
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }
  const { id } = await params;
  const result = await deleteOwnSoloPitch(viewer.id, id);
  if (!result.ok) {
    return await apiError({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
