"use client";

import { useActionState } from "react";
import { resendVerificationEmail, type FormState } from "@/app/actions/auth";
import { FormSuccess, SubmitButton } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

export function ResendVerificationButton({ row = false }: { row?: boolean } = {}) {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(
    () => resendVerificationEmail(),
    undefined,
  );

  return (
    <form action={action}>
      {state?.success && (row ? <p className="px-5 pt-3 text-sm text-green-400">{t("Gesendet — schau in dein Postfach.", "Sent — check your inbox.")}</p> : <FormSuccess message={t("Bestätigungs-E-Mail wurde erneut verschickt.", "Confirmation email sent again.")} />)}
      {row ? (
        <button type="submit" className="w-full px-5 py-3.5 text-left text-sm text-white hover:bg-zinc-900">
          {t("Bestätigungslink erneut senden", "Resend confirmation link")}
        </button>
      ) : (
        <SubmitButton>{t("Bestätigungs-E-Mail erneut senden", "Resend confirmation email")}</SubmitButton>
      )}
    </form>
  );
}
