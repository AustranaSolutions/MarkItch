"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode, ChangeEvent } from "react";
import { useT } from "@/components/i18n/lang-provider";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  errors,
  required = true,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  errors?: string[];
  required?: boolean;
  // Phase 23: optional controlled mode. React resets a <form action={fn}>
  // to its defaults once the action settles — success *or* error — so an
  // uncontrolled field (the default below) wipes itself on every failed
  // validation. Pass value+onChange from the caller to keep what the
  // person typed even when the server rejects the submission.
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        {...(onChange ? { value: value ?? "", onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : {})}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-orange-500"
      />
      {errors?.map((err) => (
        <p key={err} className="mt-1 text-sm text-red-400">
          {err}
        </p>
      ))}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{message}</p>;
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mb-4 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">{message}</p>;
}

// Phase 46: Rechtskonformitäts-Audit — jedes Video auf MarkItch ist von
// einer Marke gepostete Werbung (das ist die ganze Produktidee, "Werbung
// wird zum Entertainment"), nie privater Content. Österreichisches Recht
// (Mediengesetz/UWG) verlangt eine eindeutig erkennbare Kennzeichnung, kein
// vages "#ad" — dieses Badge steht neben jedem Solo-Pitch-/Duell-/Reaktions-
// Typ-Badge, bewusst nicht ausblendbar, in derselben Bernstein-Farbe wie
// eine Warnung, damit es sich sichtbar von den rein beschreibenden Badges
// daneben abhebt.
export function AdLabel() {
  const t = useT();
  return (
    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
      {t("Anzeige", "Ad")}
    </span>
  );
}

// Phase 46: EU-AI-Act-Transparenzpflicht — nur gerendert, wenn das Video
// beim Upload als KI-generiert/-manipuliert markiert wurde (siehe
// AiContentCheckbox), sonst nichts.
export function AiContentLabel() {
  const t = useT();
  return (
    <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
      {t("KI-generiert", "AI-generated")}
    </span>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
    >
      {pending ? "…" : children}
    </button>
  );
}
