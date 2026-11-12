"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { setLanguage } from "@/app/actions/language";
import { useT } from "@/components/i18n/lang-provider";

/** Luca 12.11.: Automatisch (Browsersprache) / Deutsch / English. */
export function LanguageSwitcher({ setting, className = "" }: { setting: "de" | "en" | "system"; className?: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <label className={`flex items-center gap-2 text-sm text-zinc-300 ${className}`}>
      <Globe size={16} className="text-zinc-500" />
      <span className="sr-only">{t("Sprache", "Language")}</span>
      <select
        value={setting}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value;
          startTransition(() => setLanguage(value));
        }}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-white outline-none focus:border-orange-500"
      >
        <option value="system">{t("Automatisch", "Automatic")}</option>
        <option value="de">Deutsch</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
