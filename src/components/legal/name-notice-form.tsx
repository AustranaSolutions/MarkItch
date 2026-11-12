"use client";

import { useActionState } from "react";
import { setNameAction } from "@/app/actions/legal";
import { useT } from "@/components/i18n/lang-provider";

export function NameNoticeForm() {
  const t = useT();
  const [state, action, pending] = useActionState(setNameAction, undefined);
  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <input
        name="name"
        autoComplete="name"
        placeholder={t("Dein Name", "Your name")}
        required
        minLength={2}
        maxLength={100}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
      />
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
      >
        {pending ? t("Wird gespeichert…", "Saving…") : t("Speichern", "Save")}
      </button>
    </form>
  );
}
