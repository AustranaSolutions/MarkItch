import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, langFromAcceptLanguage, parseLang, type Lang } from "@/lib/i18n";
import { translateMessage } from "@/lib/server-messages";

// Luca 12.11.: Sprache der Website — gewählte Sprache (Cookie aus dem Umschalter),
// sonst die Browsersprache (Deutsch nur bei deutschsprachigem Browser).
export const getLang = cache(async (): Promise<Lang> => {
  const chosen = parseLang((await cookies()).get(LANG_COOKIE)?.value);
  if (chosen) return chosen;
  return langFromAcceptLanguage((await headers()).get("accept-language"));
});

/** In Server-Komponenten: const t = await getT(); t("Abbrechen", "Cancel"). */
export async function getT() {
  const lang = await getLang();
  return (de: string, en: string) => (lang === "en" ? en : de);
}

function translateErrorList(v: unknown, lang: Lang): unknown {
  return Array.isArray(v) ? v.map((x) => (typeof x === "string" ? translateMessage(x, lang) : x)) : v;
}

/**
 * Ergebnis einer Server-Action in der Sprache der Person: übersetzt
 * error / message / errors{feld: [..]} — der Rest bleibt unverändert.
 */
export async function localizeResult<T>(result: T): Promise<T> {
  if (!result || typeof result !== "object" || Array.isArray(result)) return result;
  const lang = await getLang();
  if (lang === "de") return result;
  const r = result as Record<string, unknown>;
  const out: Record<string, unknown> = { ...r };
  for (const key of ["error", "message"]) {
    if (typeof r[key] === "string") out[key] = translateMessage(r[key] as string, lang);
  }
  for (const key of ["errors", "fieldErrors"]) {
    const v = r[key];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[key] = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, translateErrorList(x, lang)]));
    }
  }
  return out as T;
}

/** Gewählte Einstellung für den Umschalter: "de" | "en" | "system". */
export async function getLangSetting(): Promise<Lang | "system"> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value) ?? "system";
}

/** Wie getLang, aber auch außerhalb einer Anfrage nutzbar (Cron, Skripte) — dort Deutsch. */
export async function requestLang(): Promise<Lang> {
  try {
    return await getLang();
  } catch {
    return "de";
  }
}
