import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { passwordFingerprint, readMobileToken } from "@/lib/mobile-token";

/**
 * Phase 24: a ban has to cut an already-active session off immediately, not
 * just block the next login (auth.ts) — the JWT itself has no ban state
 * and isn't rechecked until it expires, so this is the only place that can
 * catch "banned mid-session". One extra query per call; this app has no
 * traffic where that matters yet.
 */
async function isBanned(userId: string): Promise<boolean> {
  const [row] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.bannedAt != null;
}

type SessionUser = { id: string; email?: string | null; name?: string | null; isVerified: boolean };
type Resolved = { user: SessionUser; banned: boolean } | null;

/**
 * RN-2: Die native App schickt `Authorization: Bearer <token>` statt eines
 * Cookies (siehe mobile-token.ts). Nur wenn dieser Header da ist, wird er
 * ausgewertet — der Web-Pfad (Cookie über auth()) bleibt exakt wie vorher.
 * Anders als beim Cookie wird hier gleich die DB-Zeile gelesen (dieselbe
 * eine Query wie isBanned): gelöschte Accounts und geänderte Passwörter
 * machen ein App-Token sofort ungültig.
 */
async function resolveBearer(authorization: string): Promise<Resolved> {
  const claims = await readMobileToken(authorization.slice("Bearer ".length).trim());
  if (!claims) return null;
  const [row] = await db
    .select({
      email: users.email,
      name: users.name,
      emailVerifiedAt: users.emailVerifiedAt,
      bannedAt: users.bannedAt,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, claims.id))
    .limit(1);
  if (!row || passwordFingerprint(row.passwordHash) !== claims.pwv) return null;
  return {
    user: { id: claims.id, email: row.email, name: row.name, isVerified: row.emailVerifiedAt !== null },
    banned: row.bannedAt != null,
  };
}

async function resolveSession(): Promise<Resolved> {
  const authorization = (await headers()).get("authorization");
  if (authorization?.startsWith("Bearer ")) return resolveBearer(authorization);

  const session = await auth();
  if (!session?.user) return null;
  return { user: session.user, banned: await isBanned(session.user.id) };
}

/** Use in Server Components / Actions that require a logged-in user. */
export async function requireUser() {
  const resolved = await resolveSession();
  if (!resolved) {
    redirect("/login");
  }
  if (resolved.banned) {
    redirect("/gesperrt");
  }
  return resolved.user;
}

/** Use where a session is optional (e.g. the home page). */
export async function getOptionalUser() {
  const resolved = await resolveSession();
  if (!resolved || resolved.banned) return null;
  return resolved.user;
}
