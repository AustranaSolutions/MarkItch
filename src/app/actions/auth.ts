"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { signIn, signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { hashToken } from "@/lib/tokens";
import {
  changePasswordForUser,
  createAccount,
  deleteAccountForUser,
  isEmailTaken,
  requestPasswordResetFor,
  resendVerificationFor,
  updateProfileForUser,
} from "@/lib/account";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "@/lib/validation";

export type FormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

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

  if (await isEmailTaken(email)) {
    return { errors: { email: ["Für diese E-Mail-Adresse existiert bereits ein Account."] } };
  }

  await createAccount({ name, email, password, accountType });

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

  await requestPasswordResetFor(parsed.data.email);

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
  const result = await resendVerificationFor(sessionUser.id);
  if (!result.ok) return { errors: { _form: ["Account nicht gefunden."] } };
  return { success: true };
}

/**
 * Phase 23: was missing entirely — there was no way to change your own
 * name or email after registration. Changing the email re-triggers
 * verification (same token flow as registration/resend), since the old
 * verification no longer proves you own the new address.
 */
export async function updateProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  // Phase 48: Profilbild optional; Logik (inkl. Neu-Verifizierung bei
  // geänderter E-Mail) in lib/account.ts, gemeinsam mit der App-Route.
  const avatarFile = formData.get("avatar");
  const result = await updateProfileForUser(sessionUser.id, {
    name: formData.get("name"),
    email: formData.get("email"),
    avatar: avatarFile instanceof File ? avatarFile : null,
  });
  if (!result.ok) return { errors: result.errors };
  return { success: true };
}

export async function changePassword(_prevState: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  const result = await changePasswordForUser(sessionUser.id, {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!result.ok) return { errors: result.errors };
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
  const result = await deleteAccountForUser(sessionUser.id, { password: formData.get("password") });
  if (!result.ok) return { errors: result.errors };
  await signOut({ redirectTo: "/" });
}
