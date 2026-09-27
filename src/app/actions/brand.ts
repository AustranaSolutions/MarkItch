"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { createBrandForUser, updateBrandForUser, type BrandInput } from "@/lib/brand-manage";

export type BrandFormState = { errors?: Record<string, string[]> } | undefined;
export type UpdateBrandFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

// RN-4: Logik in lib/brand-manage.ts, gemeinsam mit der App-Route /api/mobile/brand.

function readBrandForm(formData: FormData): BrandInput {
  const logo = formData.get("logo");
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    website: formData.get("website"),
    category: formData.get("category"),
    country: formData.get("country"),
    logo: logo instanceof File ? logo : null,
  };
}

export async function createBrand(_prevState: BrandFormState, formData: FormData): Promise<BrandFormState> {
  const user = await requireUser();
  const result = await createBrandForUser(user.id, {
    ...readBrandForm(formData),
    industryCompliance: formData.get("industryCompliance"),
  });
  if (!result.ok) return { errors: result.errors };
  redirect(`/brands/${result.slug}`);
}

export async function updateBrand(_prevState: UpdateBrandFormState, formData: FormData): Promise<UpdateBrandFormState> {
  const user = await requireUser();
  const result = await updateBrandForUser(user.id, readBrandForm(formData));
  if (!result.ok) return { errors: result.errors };
  refresh();
  return { success: true };
}
