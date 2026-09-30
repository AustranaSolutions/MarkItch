import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getCastingById } from "@/lib/casting";
import { isUuid } from "@/lib/mobile-auth";

/**
 * RN-5d: ein Partner-Casting für die App — dieselben Daten und Regeln wie
 * /castings/[id] im Web (wer einreichen/abstimmen darf). Abstimmen läuft
 * über die bestehende /api/castings/vote.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getOptionalUser();
  const casting = isUuid(id) ? await getCastingById(id, viewer?.id ?? null) : null;
  if (!casting) return NextResponse.json({ error: "Dieses Casting gibt es nicht." }, { status: 404 });

  const viewerBrand = viewer ? await getBrandForUser(viewer.id) : null;
  const isHost = viewerBrand?.id === casting.hostBrandId;
  const hasSubmitted = viewerBrand ? casting.submissions.some((s) => s.brandId === viewerBrand.id) : false;
  const { stage } = casting;

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
    canSubmit: Boolean(viewerBrand) && !isHost && !hasSubmitted && stage.stage === "open",
    canVote: Boolean(viewer) && !isHost && !hasSubmitted && (stage.stage === "open" || stage.stage === "voting"),
  });
}
