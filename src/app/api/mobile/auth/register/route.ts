import { NextRequest, NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { createAccount, isEmailTaken } from "@/lib/account";
import { readJsonBody, sessionResponse, validationErrorResponse } from "@/lib/mobile-auth";

/** RN-2: App-Registrierung — gleiche Regeln wie registerUser() (Phase 14 Rate-Limit, Acro/Assent), meldet direkt an. */
export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit("register", await getClientIp(request));
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const parsed = RegisterSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  if (await isEmailTaken(parsed.data.email)) {
    const message = "Für diese E-Mail-Adresse existiert bereits ein Account.";
    return NextResponse.json({ error: message, fieldErrors: { email: [message] } }, { status: 409 });
  }

  const user = await createAccount(parsed.data);
  return sessionResponse(user, 201);
}
