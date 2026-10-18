import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { acceptCurrentTerms } from "@/lib/account";
import { unauthorized } from "@/lib/mobile-auth";

/** Luca 18.10.: Zustimmung zur aktuellen Fassung der Nutzungsbedingungen/Datenschutzerklärung (App). */
export async function POST() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  await acceptCurrentTerms(viewer.id);
  return NextResponse.json({ ok: true });
}
