import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";

// Phase 14: anti-manipulation. Postgres-backed, same "no extra
// infrastructure" philosophy as the rest of this project (no Redis) — a
// count-then-insert per bucket+identifier, same spirit as vote tallies.
// These numbers are starting assumptions, not measured ones (like
// PRODUCTION_WINDOW_MS etc. in battle-format.ts) — easy to tune once real
// traffic shows what's actually needed.
export type RateLimitBucket =
  | "register"
  | "login"
  | "vote"
  | "challenge"
  | "reaction"
  | "like"
  | "casting-start"
  | "challenge-open"
  | "casting-submit"
  | "casting-vote"
  | "creator-submit"
  | "creator-vote"
  | "report"
  | "boost-request"
  | "analytics"
  | "upload-prepare";

const LIMITS: Record<RateLimitBucket, { max: number; windowMs: number }> = {
  register: { max: 5, windowMs: 60 * 60 * 1000 }, // 5 Registrierungen/Stunde pro IP
  login: { max: 20, windowMs: 60 * 60 * 1000 }, // RN-2: 20 App-Login-Versuche/Stunde pro IP (Passwort-Raten bremsen)
  vote: { max: 40, windowMs: 60 * 60 * 1000 }, // 40 Votes/Stunde pro IP
  challenge: { max: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10 Herausforderungen/Tag pro Marke
  reaction: { max: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10 Reaktionen/Tag pro Marke
  like: { max: 300, windowMs: 60 * 60 * 1000 }, // 300 Likes/Stunde pro Nutzer
  "casting-start": { max: 3, windowMs: 7 * 24 * 60 * 60 * 1000 }, // 3 Castings/Woche pro Marke
  // RN-7: eigener Topf — sonst blockiert ein Casting das Eröffnen der Monats-Challenges (und umgekehrt).
  "challenge-open": { max: 6, windowMs: 7 * 24 * 60 * 60 * 1000 }, // 6 Creator-Challenges/Woche pro Marke
  "casting-submit": { max: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10 Einreichungen/Tag pro Marke
  "casting-vote": { max: 40, windowMs: 60 * 60 * 1000 }, // 40 Casting-Stimmen/Stunde pro IP
  "creator-submit": { max: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10 Creator-Videos/Tag pro Marke
  "creator-vote": { max: 40, windowMs: 60 * 60 * 1000 }, // 40 Creator-Chart-Stimmen/Stunde pro IP
  report: { max: 20, windowMs: 60 * 60 * 1000 }, // 20 Meldungen/Stunde pro Nutzer
  "boost-request": { max: 5, windowMs: 60 * 60 * 1000 }, // 5 Boost-Anfragen/Stunde pro Marke
  // Audit 04.10.: Aufrufe/Link-Klicks sind die Zahlen, für die Marken zahlen sollen → nicht beliebig aufblasbar.
  analytics: { max: 300, windowMs: 60 * 60 * 1000 }, // 300 Bündel (je ≤ 20 Ereignisse)/Stunde pro IP
  // Audit 04.10. (H5): jede Upload-Adresse kann eine Datei im kostenlosen Speicher hinterlassen.
  "upload-prepare": { max: 30, windowMs: 60 * 60 * 1000 }, // 30 Upload-Adressen/Stunde pro Nutzer
};

/**
 * Counts existing hits for this bucket+identifier in the window, and — only
 * if still under the limit — records this one. Deliberately count-then-
 * insert rather than insert-then-count-and-rollback: a false negative (one
 * extra hit slipping through on a race) is harmless here, unlike votes'
 * unique index, which has to be exact.
 */
export async function checkRateLimit(bucket: RateLimitBucket, identifier: string): Promise<{ allowed: boolean }> {
  const { max, windowMs } = LIMITS[bucket];
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ n: count() })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.bucket, bucket), eq(rateLimitHits.identifier, identifier), gte(rateLimitHits.createdAt, since)));

  if ((row?.n ?? 0) >= max) {
    return { allowed: false };
  }
  await db.insert(rateLimitHits).values({ bucket, identifier });
  return { allowed: true };
}

export const RATE_LIMIT_MESSAGE = "Zu viele Versuche — bitte warte etwas und versuch es dann erneut.";

/**
 * The client's IP, for rate-limiting anonymous/pre-auth actions (register,
 * vote) where there's no other stable identifier. Works from either a
 * Route Handler (pass its NextRequest) or a Server Action/Server Component
 * (omit it, reads next/headers instead) — Vercel sets x-forwarded-for on
 * every request, first entry is the actual client.
 */
export async function getClientIp(request?: NextRequest): Promise<string> {
  const h = request ? request.headers : await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
