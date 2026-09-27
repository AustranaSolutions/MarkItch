import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, emailVerificationTokens, passwordResetTokens } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { generateRawToken, hashToken, expiresInHours } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

// RN-2: aus app/actions/auth.ts herausgelöst, damit die Web-Formulare (Server
// Actions) und die App-Routen (/api/mobile/auth/*) exakt dieselbe Logik
// nutzen — Verhalten unverändert.

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function issueVerificationToken(userId: string, email: string) {
  const rawToken = generateRawToken();
  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: expiresInHours(24),
  });
  await sendVerificationEmail(email, `${appUrl()}/verify-email?token=${rawToken}`);
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return Boolean(existing);
}

/** Legt den Account an und verschickt den Bestätigungslink. Prüft NICHT, ob die E-Mail schon vergeben ist (isEmailTaken vorher). */
export async function createAccount(input: {
  name?: string;
  email: string;
  password: string;
  accountType: "acro" | "assent";
}) {
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ email: input.email, passwordHash, name: input.name || null, accountType: input.accountType })
    .returning();
  await issueVerificationToken(user.id, user.email);
  return user;
}

/** Verschickt einen Reset-Link, falls es den Account gibt — Aufrufer antworten immer gleich, damit nicht abfragbar ist, welche E-Mails registriert sind. */
export async function requestPasswordResetFor(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return;
  const rawToken = generateRawToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: expiresInHours(1),
  });
  await sendPasswordResetEmail(user.email, `${appUrl()}/reset-password?token=${rawToken}`);
}
