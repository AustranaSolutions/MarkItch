"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginUser, type FormState } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

export function LoginForm() {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(loginUser, undefined);
  const [email, setEmail] = useState("");

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0]} />
      <Field
        label={t("E-Mail", "Email")}
        name="email"
        type="email"
        autoComplete="email"
        errors={state?.errors?.email}
        value={email}
        onChange={setEmail}
      />
      <Field
        label={t("Passwort", "Password")}
        name="password"
        type="password"
        autoComplete="current-password"
        errors={state?.errors?.password}
      />
      <div className="mb-4 text-right text-sm">
        <Link href="/forgot-password" className="text-zinc-400 hover:text-orange-500 hover:underline">
          {t("Passwort vergessen?", "Forgot password?")}
        </Link>
      </div>
      <SubmitButton>{t("Anmelden", "Log in")}</SubmitButton>
      <p className="mt-4 text-center text-sm text-zinc-400">
        {t("Noch keinen Account?", "No account yet?")}{" "}
        <Link href="/register" className="text-orange-500 hover:underline">
          {t("Registrieren", "Sign up")}
        </Link>
      </p>
    </form>
  );
}
