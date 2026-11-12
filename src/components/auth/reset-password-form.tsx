"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type FormState } from "@/app/actions/auth";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(resetPassword, undefined);

  if (state?.success) {
    return (
      <>
        <FormSuccess message={t("Dein Passwort wurde geändert.", "Your password has been changed.")} />
        <Link href="/login" className="text-orange-500 hover:underline">
          {t("Jetzt anmelden", "Log in now")}
        </Link>
      </>
    );
  }

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0]} />
      <input type="hidden" name="token" value={token} />
      <Field
        label={t("Neues Passwort", "New password")}
        name="password"
        type="password"
        autoComplete="new-password"
        errors={state?.errors?.password}
      />
      <SubmitButton>{t("Passwort ändern", "Change password")}</SubmitButton>
    </form>
  );
}
