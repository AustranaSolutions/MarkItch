import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { isAdminEmail } from "@/lib/moderation";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { apiError } from "@/lib/api-error";
import { decidePartnerRemoval } from "@/lib/partner-badge";

/** Luca 20.11. (7.5): Admin entscheidet über einen Entfernen-Antrag. Body `{ remove: boolean }`. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  if (!isAdminEmail(viewer.email)) return await apiError({ error: "Nur für Admins." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return await apiError({ error: "Nicht gefunden." }, { status: 404 });
  const { remove } = await readJsonBody(request);
  if (typeof remove !== "boolean") return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  const result = await decidePartnerRemoval(id, remove);
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
