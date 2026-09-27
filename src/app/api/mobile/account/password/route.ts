import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { changePasswordForUser } from "@/lib/account";
import { fieldErrorResponse, readJsonBody, sessionResponse, unauthorized } from "@/lib/mobile-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * RN-4: Passwort ändern. Das bisherige App-Token wird dadurch ungültig
 * (Passwort-Fingerabdruck, siehe mobile-token.ts) — die Antwort enthält
 * deshalb gleich ein neues, damit man auf diesem Gerät angemeldet bleibt.
 */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  const result = await changePasswordForUser(viewer.id, {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  });
  if (!result.ok) return fieldErrorResponse(result.errors);
  const [user] = await db.select().from(users).where(eq(users.id, viewer.id)).limit(1);
  if (!user) return NextResponse.json({ ok: true });
  return sessionResponse(user);
}
