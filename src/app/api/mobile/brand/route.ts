import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { createBrandForUser, updateBrandForUser, type BrandInput } from "@/lib/brand-manage";
import { fieldErrorResponse, unauthorized } from "@/lib/mobile-auth";

// RN-4: Marke anlegen (POST) / bearbeiten (PATCH) aus der App —
// multipart/form-data, Logo optional als Datei (max. 2 MB).

function readBrandForm(form: FormData): BrandInput {
  const logo = form.get("logo");
  return {
    name: form.get("name"),
    description: form.get("description"),
    website: form.get("website"),
    category: form.get("category"),
    country: form.get("country"),
    logo: logo instanceof File ? logo : null,
  };
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const result = await createBrandForUser(viewer.id, {
    ...readBrandForm(form),
    industryCompliance: form.get("industryCompliance"),
  });
  if (!result.ok) return fieldErrorResponse(result.errors);
  return NextResponse.json({ slug: result.slug }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const result = await updateBrandForUser(viewer.id, readBrandForm(form));
  if (!result.ok) return fieldErrorResponse(result.errors);
  return NextResponse.json({ ok: true });
}
