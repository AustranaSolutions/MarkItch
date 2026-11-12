import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { REPORT_TARGET_TYPES, submitReport, type ReportTargetType } from "@/lib/moderation";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const { allowed } = await checkRateLimit("report", viewer.id);
  if (!allowed) {
    return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const targetType = body?.targetType;
  const targetId = body?.targetId;
  const reason = body?.reason;
  const note = typeof body?.note === "string" ? body.note : undefined;

  if (
    typeof targetType !== "string" ||
    !REPORT_TARGET_TYPES.includes(targetType as ReportTargetType) ||
    typeof targetId !== "string" ||
    !targetId ||
    typeof reason !== "string" ||
    !reason
  ) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = await submitReport({
    reporterUserId: viewer.id,
    targetType: targetType as ReportTargetType,
    targetId,
    reason,
    note,
  });
  if (!result.ok) {
    return await apiError({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
