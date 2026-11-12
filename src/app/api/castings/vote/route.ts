import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { castCastingVote, getCastingById } from "@/lib/casting";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const castingId = body?.castingId;
  const submissionId = body?.submissionId;
  if (typeof castingId !== "string" || typeof submissionId !== "string" || !castingId || !submissionId) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit("casting-vote", await getClientIp(request));
  if (!allowed) {
    return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const result = await castCastingVote(viewer.id, castingId, submissionId);
  if (result.error) {
    return await apiError({ error: result.error }, { status: 400 });
  }

  const casting = await getCastingById(castingId, viewer.id);
  return NextResponse.json({ submissions: casting?.submissions ?? [], viewerVotedSubmissionId: submissionId });
}
