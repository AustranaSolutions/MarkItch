import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getCastingById } from "@/lib/casting";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { deleteCastingFor, updateCastingPromptFor } from "@/lib/casting-manage";
import { apiError } from "@/lib/api-error";
import { isAdminEmail } from "@/lib/moderation";
import { getCastingPartner, partnerBadgeEnabled } from "@/lib/partner-badge";

/**
 * RN-5d: ein Partner-Casting für die App — dieselben Daten und Regeln wie
 * /castings/[id] im Web (wer einreichen/abstimmen darf). Abstimmen läuft
 * über die bestehende /api/castings/vote.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getOptionalUser();
  const casting = isUuid(id) ? await getCastingById(id, viewer?.id ?? null) : null;
  if (!casting) return await apiError({ error: "Dieses Casting gibt es nicht." }, { status: 404 });

  const viewerBrand = viewer ? await getBrandForUser(viewer.id) : null;
  const isHost = viewerBrand?.id === casting.hostBrandId;
  const hasSubmitted = viewerBrand ? casting.submissions.some((s) => s.brandId === viewerBrand.id) : false;
  const { stage } = casting;
  // Luca 20.11. (7.5): Partner-Abzeichen — alles leer, solange PARTNER_BADGE_ENABLED nicht gesetzt ist.
  const partner = await getCastingPartner(casting.id);
  const badgeOn = partnerBadgeEnabled();

  return NextResponse.json({
    id: casting.id,
    prompt: casting.prompt,
    hostBrand: casting.hostBrand,
    stage:
      stage.stage === "open"
        ? { stage: "open", deadline: stage.deadline.toISOString() }
        : stage.stage === "voting"
          ? { stage: "voting", endsAt: stage.endsAt.toISOString() }
          : { stage: "finished", winnerBrandId: stage.winnerBrandId },
    submissions: casting.submissions,
    viewerVotedSubmissionId: casting.viewerVotedSubmissionId,
    isHost,
    // Luca 18.11.: Marke darf verlängern (siehe extendCastingFor) — Abstimmung ohne Einreichung zählt mit.
    canExtend: isHost && (stage.stage === "open" || (stage.stage === "voting" && casting.submissions.length === 0)),
    canSubmit: Boolean(viewerBrand) && !isHost && !hasSubmitted && stage.stage === "open",
    canVote: Boolean(viewer) && !isHost && !hasSubmitted && (stage.stage === "open" || stage.stage === "voting"),
    partner,
    canChoosePartner: badgeOn && isHost && stage.stage === "finished" && !partner && casting.submissions.length > 0,
    canRequestPartnerRemoval: Boolean(partner) && !partner?.removalRequested && (isHost || viewerBrand?.id === partner?.brandId),
    canDecidePartnerRemoval: Boolean(partner?.removalRequested) && isAdminEmail(viewer?.email),
  });
}

/** RN-7: eigenes Casting löschen (nur die Marke selbst). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return await apiError({ error: "Nicht gefunden." }, { status: 404 });
  const result = await deleteCastingFor(viewer, id);
  if (!result.ok) return await apiError({ error: result.error }, { status: 403 });
  return NextResponse.json({ ok: true });
}

/** Luca 18.11.: Text des eigenen Castings ändern. Body `{ prompt }`. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  const { prompt } = await readJsonBody(request);
  const result = await updateCastingPromptFor(viewer, id, prompt);
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
