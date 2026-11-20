import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { apiError } from "@/lib/api-error";
import { requestPartnerRemoval } from "@/lib/partner-badge";

/** Luca 20.11. (7.5): Entfernen des Abzeichens beantragen — MarkItch prüft. Body `{ note }`. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return await apiError({ error: "Nicht gefunden." }, { status: 404 });
  const brand = await getBrandForUser(viewer.id);
  if (!brand) return await apiError({ error: "Nur für Marken." }, { status: 403 });
  const { note } = await readJsonBody(request);
  const result = await requestPartnerRemoval(brand.id, id, note);
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
