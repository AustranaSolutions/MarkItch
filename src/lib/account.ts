import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, users, emailVerificationTokens, passwordResetTokens } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { uploadImage, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { ChangePasswordSchema, DeleteAccountSchema, UpdateProfileSchema } from "@/lib/validation";
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

// RN-4: Profil, Passwort, Account löschen — gemeinsam für Web-Actions
// (actions/auth.ts) und App-Routen (/api/mobile/account/*).

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB — gleiche Grenze wie ein Markenlogo

type FieldErrors = Record<string, string[]>;

/** Prüft ein hochgeladenes Bild (Profilbild/Logo). null = ok. */
export function validateImageFile(file: File, field: string, label: string): FieldErrors | null {
  if (file.size > MAX_AVATAR_BYTES) return { [field]: [`${label} darf maximal 2 MB groß sein.`] };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { [field]: ["Erlaubt: PNG, JPEG, WEBP oder SVG."] };
  return null;
}

export async function updateProfileForUser(
  userId: string,
  input: { name: unknown; email: unknown; avatar: File | null },
): Promise<{ ok: true; emailChanged: boolean } | { ok: false; errors: FieldErrors }> {
  const parsed = UpdateProfileSchema.safeParse({ name: input.name ?? "", email: input.email });
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors as FieldErrors };
  const { name, email } = parsed.data;

  const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!dbUser) return { ok: false, errors: { _form: ["Account nicht gefunden."] } };

  const emailChanged = email !== dbUser.email;
  if (emailChanged && (await isEmailTaken(email))) {
    return { ok: false, errors: { email: ["Für diese E-Mail-Adresse existiert bereits ein Account."] } };
  }

  let avatarUrl = dbUser.avatarUrl;
  if (input.avatar && input.avatar.size > 0) {
    const invalid = validateImageFile(input.avatar, "avatar", "Profilbild");
    if (invalid) return { ok: false, errors: invalid };
    avatarUrl = (await uploadImage(input.avatar, "avatars")).url;
  }

  await db
    .update(users)
    .set({
      name: name || null,
      email,
      avatarUrl,
      emailVerifiedAt: emailChanged ? null : dbUser.emailVerifiedAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, dbUser.id));

  // E-Mail geändert → alte Bestätigung gilt nicht mehr, neuer Link.
  if (emailChanged) {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, dbUser.id));
    await issueVerificationToken(dbUser.id, email);
  }
  return { ok: true, emailChanged };
}

export async function changePasswordForUser(
  userId: string,
  input: { currentPassword: unknown; newPassword: unknown },
): Promise<{ ok: true } | { ok: false; errors: FieldErrors }> {
  const parsed = ChangePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors as FieldErrors };

  const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!dbUser) return { ok: false, errors: { _form: ["Account nicht gefunden."] } };
  if (!(await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash))) {
    return { ok: false, errors: { currentPassword: ["Aktuelles Passwort ist falsch."] } };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, dbUser.id));
  return { ok: true };
}

/**
 * Phase 24: Account löschen (App-Store-Pflicht, Guideline 5.1.1v), mit
 * Passwort bestätigt. Alle Fremdschlüssel auf users sind cascade; eine
 * eigene Marke bleibt bewusst bestehen (siehe Kommentar bei deleteAccount).
 */
export async function deleteAccountForUser(
  userId: string,
  input: { password: unknown },
): Promise<{ ok: true } | { ok: false; errors: FieldErrors }> {
  const parsed = DeleteAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors as FieldErrors };

  const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!dbUser) return { ok: false, errors: { _form: ["Account nicht gefunden."] } };
  if (!(await verifyPassword(parsed.data.password, dbUser.passwordHash))) {
    return { ok: false, errors: { password: ["Passwort ist falsch."] } };
  }

  // Audit M4: Ist dieses Konto das letzte Mitglied einer Marke, geht die
  // Marke mit — samt Videos, Duellen, Reaktionen (alles hängt per Cascade an
  // brands). Sonst bliebe eine herrenlose Marke stehen, die niemand mehr
  // verwalten kann. Die Videodateien räumt der tägliche Cron weg.
  await db.transaction(async (tx) => {
    const memberships = await tx.select({ brandId: brandMembers.brandId }).from(brandMembers).where(eq(brandMembers.userId, dbUser.id));
    for (const { brandId } of memberships) {
      const [{ n }] = await tx.select({ n: count() }).from(brandMembers).where(eq(brandMembers.brandId, brandId));
      if (n <= 1) await tx.delete(brands).where(eq(brands.id, brandId));
    }
    await tx.delete(users).where(eq(users.id, dbUser.id));
  });
  return { ok: true };
}

export async function resendVerificationFor(userId: string): Promise<{ ok: boolean }> {
  const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!dbUser) return { ok: false };
  if (dbUser.emailVerifiedAt) return { ok: true };
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, dbUser.id));
  await issueVerificationToken(dbUser.id, dbUser.email);
  return { ok: true };
}
