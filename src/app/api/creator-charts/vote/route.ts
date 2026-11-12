import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { castCreatorVote } from "@/lib/creator-charts";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const submissionId = body?.submissionId;
  if (typeof submissionId !== "string" || !submissionId) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit("creator-vote", await getClientIp(request));
  if (!allowed) {
    return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const result = await castCreatorVote(viewer.id, submissionId);
  if (result.error) {
    return await apiError({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
