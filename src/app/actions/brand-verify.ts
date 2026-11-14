"use server";

import { localizeResult } from "@/lib/lang";
import { refresh } from "next/cache";
import { requireAdminUser } from "@/lib/moderation";
import { setBrandVerified } from "@/lib/brand-verify";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { requestVerification } from "@/lib/brand-trust";

async function setBrandVerifiedActionImpl(formData: FormData) {
  await requireAdminUser();
  const brandId = formData.get("brandId");
  if (typeof brandId !== "string" || !brandId) return;
  await setBrandVerified(brandId, formData.get("verified") === "on");
  refresh();
}

// Luca 12.11.: Ergebnisse in der Sprache der Person (siehe lib/lang.ts).
export async function setBrandVerifiedAction(...args: Parameters<typeof setBrandVerifiedActionImpl>) {
  return localizeResult(await setBrandVerifiedActionImpl(...args));
}

// Luca 13.11. (Phase 4): Prüfung per Code beantragen (eigene Marke).
export type VerificationRequestState = { error?: string; success?: boolean } | undefined;

async function requestVerificationActionImpl(_prev: VerificationRequestState, formData: FormData): Promise<VerificationRequestState> {
  const user = await requireUser();
  const brand = await getBrandForUser(user.id);
  if (!brand) return { error: "Du hast keine Marke." };
  const result = await requestVerification(brand.id, formData.get("url"));
  if (!result.ok) return { error: result.error };
  refresh();
  return { success: true };
}

export async function requestVerificationAction(...args: Parameters<typeof requestVerificationActionImpl>) {
  return localizeResult(await requestVerificationActionImpl(...args));
}
