"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users, emailVerificationTokens, passwordResetTokens } from "@/db/schema";
import { signIn, signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateRawToken, hashToken, expiresInHours } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { uploadImage, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
  DeleteAccountSchema,
} from "@/lib/validation";

export type FormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

async function issueVerificationToken(userId: string, email: string) {
  const rawToken = generateRawToken();
  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: expiresInHours(24),
  });
  await sendVerificationEmail(email, `${appUrl()}/verify-email?token=${rawToken}`);
}

export async function registerUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  // Phase 14: the one lever against mass fake-account creation this stack
  // has without adding a CAPTCHA/phone-verification dependency — an IP can
  // still register a handful of real accounts (shared household/office
  // wifi), just not hundreds in a script.
  const { allowed } = await checkRateLimit("register", await getClientIp());
  if (!allowed) {
    return { errors: { _form: [RATE_LIMIT_MESSAGE] } };
  }

  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, password, accountType } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return { errors: { email: ["Für diese E-Mail-Adresse existiert bereits ein Account."] } };
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, name: name || null, accountType })
    .returning({ id: users.id, email: users.email });

  await issueVerificationToken(user.id, user.email);

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        errors: {
          _form: ["Account wurde erstellt, aber der automatische Login ist fehlgeschlagen. Bitte melde dich manuell an."],
        },
      };
    }
    throw error;
  }
}

export async function loginUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { errors: { _form: ["E-Mail oder Passwort ist falsch."] } };
    }
    throw error;
  }
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
}

export async function requestPasswordReset(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (user) {
    const rawToken = generateRawToken();
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: expiresInHours(1),
    });
    await sendPasswordResetEmail(user.email, `${appUrl()}/reset-password?token=${rawToken}`);
  }

  // Same response whether or not the account exists, so the form can't be
  // used to check which emails are registered.
  return { success: true };
}

export async function resetPassword(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.expiresAt < new Date()) {
    return { errors: { _form: ["Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an."] } };
  }

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, record.userId));

  return { success: true };
}

export async function resendVerificationEmail(): Promise<FormState> {
  const sessionUser = await requireUser();
  const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!dbUser) return { errors: { _form: ["Account nicht gefunden."] } };
  if (dbUser.emailVerifiedAt) return { success: true };

  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, dbUser.id));
  await issueVerificationToken(dbUser.id, dbUser.email);
  return { success: true };
}

/**
 * Phase 23: was missing entirely — there was no way to change your own
 * name or email after registration. Changing the email re-triggers
 * verification (same token flow as registration/resend), since the old
 * verification no longer proves you own the new address.
 */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB — gleiche Grenze wie ein Markenlogo

export async function updateProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  // Phase 48: die Avatar-Datei muss vor dem Zod-Parse raus — UpdateProfileSchema
  // erwartet nur Strings, Object.fromEntries(formData) würde ein File-Objekt sonst
  // unverändert durchreichen und an z.email()/z.string() scheitern.
  const avatarFile = formData.get("avatar");
  formData.delete("avatar");
  const parsed = UpdateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { name, email } = parsed.data;

  const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!dbUser) return { errors: { _form: ["Account nicht gefunden."] } };

  const emailChanged = email !== dbUser.email;
  if (emailChanged) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return { errors: { email: ["Für diese E-Mail-Adresse existiert bereits ein Account."] } };
  }

  let avatarUrl = dbUser.avatarUrl;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { errors: { avatar: ["Profilbild darf maximal 2 MB groß sein."] } };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(avatarFile.type)) {
      return { errors: { avatar: ["Erlaubt: PNG, JPEG, WEBP oder SVG."] } };
    }
    const uploaded = await uploadImage(avatarFile, "avatars");
    avatarUrl = uploaded.url;
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

  if (emailChanged) {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, dbUser.id));
    await issueVerificationToken(dbUser.id, email);
  }

  return { success: true };
}

export async function changePassword(_prevState: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  const parsed = ChangePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { currentPassword, newPassword } = parsed.data;

  const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!dbUser) return { errors: { _form: ["Account nicht gefunden."] } };

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) return { errors: { currentPassword: ["Aktuelles Passwort ist falsch."] } };

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, dbUser.id));

  return { success: true };
}

/**
 * Phase 24: self-service account deletion — an App Store hard requirement
 * for apps with account creation (Guideline 5.1.1v). Password-confirmed,
 * same "prove you're really you" gate as changePassword. Every FK to
 * users.id is onDelete: cascade (see schema.ts) except brandMembers'
 * brand itself: if this was a brand's only member, the brand and
 * everything posted under it stays live, just ownerless — DeleteAccountForm
 * warns about this before submitting, deleting a brand outright would also
 * wipe any Duell it's currently part of for the *other* brand and that
 * Duell's voters, too destructive to do silently as a side effect here.
 */
export async function deleteAccount(_prevState: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  const parsed = DeleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!dbUser) return { errors: { _form: ["Account nicht gefunden."] } };

  const valid = await verifyPassword(parsed.data.password, dbUser.passwordHash);
  if (!valid) return { errors: { password: ["Passwort ist falsch."] } };

  await db.delete(users).where(eq(users.id, dbUser.id));
  await signOut({ redirectTo: "/" });
}
