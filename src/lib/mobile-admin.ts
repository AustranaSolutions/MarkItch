import "server-only";
import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { isAdminEmail } from "@/lib/moderation";
import { unauthorized } from "@/lib/mobile-auth";

/**
 * Luca 11.10.: Admin-Bereich in der App (Moderation, Marken, Boosts,
 * Analytics) — gleiche Freigabe wie /admin/* im Web: ADMIN_EMAILS.
 */
export async function requireMobileAdmin(): Promise<{ error: NextResponse } | { error: null; userId: string }> {
  const viewer = await getOptionalUser();
  if (!viewer) return { error: unauthorized() };
  if (!isAdminEmail(viewer.email)) {
    return { error: NextResponse.json({ error: "Nur für Admins." }, { status: 403 }) };
  }
  return { error: null, userId: viewer.id };
}
