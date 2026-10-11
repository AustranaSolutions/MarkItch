import { NextRequest, NextResponse } from "next/server";
import {
  banUser,
  getBannedUsers,
  getOpenReports,
  removeReportedContent,
  REPORT_TARGET_TYPES,
  resolveReport,
  unbanUser,
  type ReportTargetType,
} from "@/lib/moderation";
import { isUuid, readJsonBody } from "@/lib/mobile-auth";
import { requireMobileAdmin } from "@/lib/mobile-admin";

// Luca 11.10.: Moderation in der App — dieselben Aktionen wie /admin/moderation.

const REMOVABLE_TYPES = new Set<ReportTargetType>([
  "solo_pitch",
  "reaction",
  "comment",
  "battle_a",
  "battle_b",
  "casting_submission",
  "creator_submission",
]);

export async function GET() {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const [reports, banned] = await Promise.all([getOpenReports(), getBannedUsers()]);
  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      reporterEmail: r.reporterEmail,
      targetLabel: r.targetLabel,
      targetHref: r.targetHref,
      targetOwners: r.targetOwners,
      removable: REMOVABLE_TYPES.has(r.targetType),
    })),
    banned: banned.map((u) => ({ id: u.id, email: u.email, bannedAt: u.bannedAt?.toISOString() ?? null })),
  });
}

/** Body: `{ action: "resolve" | "remove" | "ban" | "unban", reportId?, targetType?, targetId?, userId? }` */
export async function POST(request: NextRequest) {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const body = await readJsonBody(request);
  const bad = () => NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const reportId = typeof body.reportId === "string" && isUuid(body.reportId) ? body.reportId : null;
  const userId = typeof body.userId === "string" && isUuid(body.userId) ? body.userId : null;

  switch (body.action) {
    case "resolve":
      if (!reportId) return bad();
      await resolveReport(reportId);
      break;
    case "remove": {
      const targetType = body.targetType as ReportTargetType;
      if (!reportId || !REPORT_TARGET_TYPES.includes(targetType) || !REMOVABLE_TYPES.has(targetType)) return bad();
      if (typeof body.targetId !== "string" || !isUuid(body.targetId)) return bad();
      await removeReportedContent(targetType, body.targetId);
      await resolveReport(reportId);
      break;
    }
    case "ban":
      if (!userId) return bad();
      await banUser(userId);
      if (reportId) await resolveReport(reportId);
      break;
    case "unban":
      if (!userId) return bad();
      await unbanUser(userId);
      break;
    default:
      return bad();
  }
  return NextResponse.json({ ok: true });
}
