"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions/auth";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

export function ChangePasswordForm() {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(changePassword, undefined);

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0]} />
      {state?.success && <FormSuccess message={t("Passwort geändert.", "Password changed.")} />}
      <Field
        label={t("Aktuelles Passwort", "Current password")}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        errors={state?.errors?.currentPassword}
      />
      <Field
        label={t("Neues Passwort", "New password")}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        errors={state?.errors?.newPassword}
      />
      <SubmitButton>{t("Passwort ändern", "Change password")}</SubmitButton>
    </form>
  );
}
