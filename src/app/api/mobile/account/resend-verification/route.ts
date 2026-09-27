import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { resendVerificationFor } from "@/lib/account";
import { unauthorized } from "@/lib/mobile-auth";

/** RN-4: Bestätigungslink erneut schicken. */
export async function POST() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  await resendVerificationFor(viewer.id);
  return NextResponse.json({ ok: true });
}
