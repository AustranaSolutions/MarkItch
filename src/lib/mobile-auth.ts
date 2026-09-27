import "server-only";
import { NextResponse } from "next/server";
import type * as z from "zod";
import type { users } from "@/db/schema";
import { issueMobileToken } from "@/lib/mobile-token";

// RN-2: gemeinsame Bausteine der /api/mobile/auth/*-Routen.

export type MobileUser = {
  id: string;
  email: string;
  name: string | null;
  isVerified: boolean;
  accountType: string;
  avatarUrl: string | null;
};

type UserRow = typeof users.$inferSelect;

export function toMobileUser(row: UserRow): MobileUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isVerified: row.emailVerifiedAt !== null,
    accountType: row.accountType,
    avatarUrl: row.avatarUrl,
  };
}

/** Antwort nach erfolgreichem Login/Registrieren/Token-Erneuern. */
export async function sessionResponse(row: UserRow, status = 200) {
  const token = await issueMobileToken(row);
  return NextResponse.json({ token, user: toMobileUser(row) }, { status });
}

/**
 * Validierungsfehler im selben Format wie die übrigen API-Routen (`error`)
 * plus die Feldfehler, damit die App sie direkt unter dem Feld zeigen kann
 * — wie die Web-Formulare.
 */
export function validationErrorResponse(error: z.ZodError) {
  const fieldErrors = (error.flatten().fieldErrors ?? {}) as Record<string, string[] | undefined>;
  const first = Object.values(fieldErrors).find((messages) => messages?.length)?.[0];
  return NextResponse.json({ error: first ?? "Ungültige Eingabe.", fieldErrors }, { status: 400 });
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}
