"use server";

import { localizeResult } from "@/lib/lang";
import { refresh } from "next/cache";
import {
  banUser,
  removeReportedContent,
  requireAdminUser,
  resolveReport,
  unbanUser,
  type ReportTargetType,
} from "@/lib/moderation";

async function resolveReportActionImpl(formData: FormData) {
  await requireAdminUser();
  const reportId = formData.get("reportId");
  if (typeof reportId !== "string" || !reportId) return;
  await resolveReport(reportId);
  refresh();
}

/** Deletes/nulls the reported content itself, then resolves the report. */
async function removeContentActionImpl(formData: FormData) {
  await requireAdminUser();
  const reportId = formData.get("reportId");
  const targetType = formData.get("targetType");
  const targetId = formData.get("targetId");
  if (typeof reportId !== "string" || !reportId || typeof targetType !== "string" || typeof targetId !== "string" || !targetId) {
    return;
  }
  await removeReportedContent(targetType as ReportTargetType, targetId);
  await resolveReport(reportId);
  refresh();
}

/** Bans the content's owner and, if called from a report row, resolves that report too. */
async function banUserActionImpl(formData: FormData) {
  await requireAdminUser();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) return;
  await banUser(userId);
  const reportId = formData.get("reportId");
  if (typeof reportId === "string" && reportId) await resolveReport(reportId);
  refresh();
}

async function unbanUserActionImpl(formData: FormData) {
  await requireAdminUser();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) return;
  await unbanUser(userId);
  refresh();
}

// Luca 12.11.: Ergebnisse in der Sprache der Person (siehe lib/lang.ts).
export async function resolveReportAction(...args: Parameters<typeof resolveReportActionImpl>) {
  return localizeResult(await resolveReportActionImpl(...args));
}
export async function removeContentAction(...args: Parameters<typeof removeContentActionImpl>) {
  return localizeResult(await removeContentActionImpl(...args));
}
export async function banUserAction(...args: Parameters<typeof banUserActionImpl>) {
  return localizeResult(await banUserActionImpl(...args));
}
export async function unbanUserAction(...args: Parameters<typeof unbanUserActionImpl>) {
  return localizeResult(await unbanUserActionImpl(...args));
}
