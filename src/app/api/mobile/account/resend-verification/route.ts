import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { resendVerificationFor } from "@/lib/account";
import { unauthorized } from "@/lib/mobile-auth";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";

/** RN-4: Bestätigungslink erneut schicken. */
export async function POST() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const result = await resendVerificationFor(viewer.id);
  if (result.limited) return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  return NextResponse.json({ ok: true });
}
