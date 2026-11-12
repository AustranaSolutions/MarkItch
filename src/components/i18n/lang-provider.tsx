"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

// Luca 12.11.: Sprache für Client-Komponenten — kommt vom Server (Root-Layout).
const LangContext = createContext<Lang>("de");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** In Client-Komponenten: const t = useT(); t("Abbrechen", "Cancel"). */
export function useT() {
  const lang = useContext(LangContext);
  return (de: string, en: string) => (lang === "en" ? en : de);
}
