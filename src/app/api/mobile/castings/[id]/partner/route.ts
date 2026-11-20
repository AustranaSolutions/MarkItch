import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { apiError } from "@/lib/api-error";
import { confirmCastingPartner } from "@/lib/partner-badge";

/** Luca 20.11. (7.5): Marke bestätigt ihren offiziellen Partner. Body `{ submissionId }`. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return await apiError({ error: "Nicht gefunden." }, { status: 404 });
  const brand = await getBrandForUser(viewer.id);
  if (!brand) return await apiError({ error: "Nur für Marken." }, { status: 403 });
  const { submissionId } = await readJsonBody(request);
  const result = await confirmCastingPartner(brand.id, id, submissionId);
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
