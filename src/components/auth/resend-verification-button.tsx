"use client";

import { useActionState } from "react";
import { resendVerificationEmail, type FormState } from "@/app/actions/auth";
import { FormSuccess, SubmitButton } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

export function ResendVerificationButton() {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(
    () => resendVerificationEmail(),
    undefined,
  );

  return (
    <form action={action}>
      {state?.success && <FormSuccess message={t("Bestätigungs-E-Mail wurde erneut verschickt.", "Confirmation email sent again.")} />}
      <SubmitButton>{t("Bestätigungs-E-Mail erneut senden", "Resend confirmation email")}</SubmitButton>
    </form>
  );
}
