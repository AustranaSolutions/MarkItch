"use server";

import { localizeResult } from "@/lib/lang";
import { refresh } from "next/cache";
import { requireAdminUser } from "@/lib/moderation";
import { setBrandVerified } from "@/lib/brand-verify";

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
