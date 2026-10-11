import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getViewerActivity } from "@/lib/viewer-activity";
import { unauthorized } from "@/lib/mobile-auth";

// Luca 11.10.: Zuschauer-Profil in der App — eigene Aktivität, Serie,
// Geschmacks-Profil und eigene Reaktionsvideos. Nur für das eigene Konto.
export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  return NextResponse.json(await getViewerActivity(viewer.id));
}
