import "server-only";
import { createHash } from "crypto";
import { encode, decode } from "next-auth/jwt";

/**
 * RN-2: Login-Token für die native App (MarkItch-mobile). Die Web-App nutzt
 * weiter das NextAuth-Session-Cookie — die App schickt stattdessen
 * `Authorization: Bearer <token>`, siehe getSessionUser() in session.ts.
 *
 * Gleiches Format/Geheimnis wie das Cookie (NextAuth-JWE mit AUTH_SECRET),
 * aber ein eigener `salt`: ein App-Token lässt sich nicht als Web-Cookie
 * verwenden und umgekehrt.
 */
const MOBILE_TOKEN_SALT = "markitch-mobile-token";
export const MOBILE_TOKEN_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 Tage, wie NextAuths Cookie-Default

export type MobileTokenClaims = {
  id: string;
  email: string;
  name: string | null;
  isVerified: boolean;
  /** Fingerabdruck des Passwort-Hashs — ändert sich das Passwort (Ändern/Zurücksetzen), werden alle alten App-Tokens ungültig. */
  pwv: string;
};

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set.");
  return value;
}

export function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export async function issueMobileToken(user: {
  id: string;
  email: string;
  name: string | null;
  emailVerifiedAt: Date | null;
  passwordHash: string;
}): Promise<string> {
  const claims: MobileTokenClaims = {
    id: user.id,
    email: user.email,
    name: user.name,
    isVerified: user.emailVerifiedAt !== null,
    pwv: passwordFingerprint(user.passwordHash),
  };
  return encode({ token: claims, secret: secret(), salt: MOBILE_TOKEN_SALT, maxAge: MOBILE_TOKEN_MAX_AGE_S });
}

/** null bei ungültigem, manipuliertem oder abgelaufenem Token. */
export async function readMobileToken(token: string): Promise<MobileTokenClaims | null> {
  try {
    const payload = await decode<Partial<MobileTokenClaims>>({ token, secret: secret(), salt: MOBILE_TOKEN_SALT });
    if (!payload || typeof payload.id !== "string" || typeof payload.pwv !== "string") return null;
    return payload as MobileTokenClaims;
  } catch {
    return null;
  }
}
