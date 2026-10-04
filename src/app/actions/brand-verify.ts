"use server";

import { refresh } from "next/cache";
import { requireAdminUser } from "@/lib/moderation";
import { setBrandVerified } from "@/lib/brand-verify";

export async function setBrandVerifiedAction(formData: FormData) {
  await requireAdminUser();
  const brandId = formData.get("brandId");
  if (typeof brandId !== "string" || !brandId) return;
  await setBrandVerified(brandId, formData.get("verified") === "on");
  refresh();
}
