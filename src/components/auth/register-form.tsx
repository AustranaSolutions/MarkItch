"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { registerUser, type FormState } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/ui";
import { trackVisitorEvent } from "@/lib/analytics-client";

type AccountType = "acro" | "assent";

function RoleCard({
  value,
  title,
  description,
  selected,
  onSelect,
}: {
  value: AccountType;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex-1 rounded-lg border p-3 text-left transition-colors " +
        (selected ? "border-orange-500 bg-orange-500/10" : "border-zinc-700 hover:border-zinc-500")
      }
    >
      <p className={"text-sm font-semibold " + (selected ? "text-orange-400" : "text-white")}>{title}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
    </button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerUser, undefined);
  const [accountType, setAccountType] = useState<AccountType>("assent");
  // Phase 23: kept in local state (not left to the native form) so a failed
  // submission — e.g. "Passwort braucht eine Zahl" — doesn't also wipe the
  // name/email the person already typed. See Field's `onChange` doc in
  // components/ui.tsx for why an uncontrolled field loses this on error.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Phase 47: Registrierungs-Funnel (BETA-2-F) — "abgeschlossen" ist die
  // Ground Truth users.createdAt, "begonnen" braucht aber ein eigenes Event,
  // da ein Formularbesuch ohne Absenden sonst unsichtbar bliebe.
  useEffect(() => {
    trackVisitorEvent("register_started");
  }, []);

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0]} />

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-zinc-300">Wer bist du?</p>
        <input type="hidden" name="accountType" value={accountType} />
        <div className="flex gap-2">
          <RoleCard
            value="acro"
            title="Acro"
            description="Marke — postet Pitches"
            selected={accountType === "acro"}
            onSelect={() => setAccountType("acro")}
          />
          <RoleCard
            value="assent"
            title="Assent"
            description="Schaut zu & stimmt ab"
            selected={accountType === "assent"}
            onSelect={() => setAccountType("assent")}
          />
        </div>
        {state?.errors?.accountType?.map((err) => (
          <p key={err} className="mt-1 text-sm text-red-400">
            {err}
          </p>
        ))}
      </div>

      <Field label="Name (optional)" name="name" required={false} errors={state?.errors?.name} value={name} onChange={setName} />
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        errors={state?.errors?.email}
        value={email}
        onChange={setEmail}
      />
      <Field
        label="Passwort"
        name="password"
        type="password"
        autoComplete="new-password"
        errors={state?.errors?.password}
      />
      <SubmitButton>Account erstellen</SubmitButton>
      <p className="mt-3 text-center text-xs text-zinc-500">
        Mit der Registrierung bestätigst du, dass du mindestens 16 Jahre alt bist, und akzeptierst die{" "}
        <Link href="/nutzungsbedingungen" className="text-orange-400 hover:underline">
          Nutzungsbedingungen
        </Link>{" "}
        und die{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
      <p className="mt-4 text-center text-sm text-zinc-400">
        Schon registriert?{" "}
        <Link href="/login" className="text-orange-500 hover:underline">
          Anmelden
        </Link>
      </p>
    </form>
  );
}
