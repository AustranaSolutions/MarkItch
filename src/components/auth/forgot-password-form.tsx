"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type FormState } from "@/app/actions/auth";
import { Field, FormSuccess, SubmitButton } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

export function ForgotPasswordForm() {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, undefined);

  if (state?.success) {
    return (
      <FormSuccess message={t("Falls diese E-Mail-Adresse registriert ist, wurde ein Link zum Zurücksetzen verschickt.", "If this email address is registered, a reset link has been sent.")} />
    );
  }

  return (
    <form action={action}>
      <Field label={t("E-Mail", "Email")} name="email" type="email" autoComplete="email" errors={state?.errors?.email} />
      <SubmitButton>{t("Link anfordern", "Request link")}</SubmitButton>
      <p className="mt-4 text-center text-sm text-zinc-400">
        <Link href="/login" className="text-orange-500 hover:underline">
          {t("Zurück zur Anmeldung", "Back to login")}
        </Link>
      </p>
    </form>
  );
}
