"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useT } from "@/components/i18n/lang-provider";

/** Luca 20.11.: Zurück wie in der App — dorthin, wo man herkam (Profil oder Einstellungen). */
export function BackButton({ fallback }: { fallback: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={t("Zurück", "Back")}
      className="text-zinc-400 hover:text-white"
      onClick={() => {
        const sameSite = document.referrer.startsWith(window.location.origin);
        if (sameSite && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <ChevronLeft size={24} />
    </button>
  );
}
