import { NextRequest, NextResponse } from "next/server";
import { ForgotPasswordSchema } from "@/lib/validation";
import { requestPasswordResetFor } from "@/lib/account";
import { readJsonBody, validationErrorResponse } from "@/lib/mobile-auth";

/**
 * RN-2: "Passwort vergessen" aus der App. Der Link in der Mail führt vorerst
 * auf die Web-Seite /reset-password (Web-Fallback) — Deep Link direkt in die
 * App kommt mit den Universal Links. Antwort immer gleich, egal ob es den
 * Account gibt (wie requestPasswordReset im Web).
 */
export async function POST(request: NextRequest) {
  const parsed = ForgotPasswordSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  await requestPasswordResetFor(parsed.data.email);
  return NextResponse.json({ ok: true });
}
