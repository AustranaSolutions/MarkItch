import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPasswordOrDummy } from "@/lib/password";
import { LoginSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { readJsonBody, sessionResponse, validationErrorResponse } from "@/lib/mobile-auth";
import { apiError } from "@/lib/api-error";

const INVALID_CREDENTIALS = "E-Mail oder Passwort ist falsch.";

/** RN-2: App-Login. Gleiche Prüfungen wie authorize() in auth.ts, liefert aber ein Token statt eines Cookies. */
export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit("login", await getClientIp(request));
  if (!allowed) {
    return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const parsed = LoginSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return validationErrorResponse(parsed.error);
  // Sicherheits-Check 19.11.: zusätzlich pro E-Mail (Raten über viele IPs).
  if (!(await checkRateLimit("login-email", parsed.data.email.trim().toLowerCase())).allowed) {
    return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  // Gesperrt → dieselbe generische Meldung wie im Web (Phase 24: Sperrstatus nicht verraten).
  // Luca 20.11.: immer rechnen, auch ohne Konto (gleiche Antwortzeit).
  const valid = await verifyPasswordOrDummy(parsed.data.password, user?.passwordHash);
  if (!user || user.bannedAt || !valid) {
    return await apiError({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  return sessionResponse(user);
}
