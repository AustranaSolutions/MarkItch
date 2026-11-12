// Luca 12.11.: MarkItch auf Deutsch und Englisch. Deutschsprachige Geräte/Browser
// sehen Deutsch, alle anderen Englisch. Die App schickt ihre Sprache als
// Accept-Language mit, das Web nimmt das Cookie (Umschalter) oder den Browser.
//
// Client-sicher (keine Server-Imports) — wird auch von Client-Komponenten genutzt.

export type Lang = "de" | "en";

export const LANG_COOKIE = "markitch-lang";

/** "de" nur, wenn Deutsch die bevorzugte Sprache ist — sonst Englisch. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return "de";
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("de") ? "de" : "en";
}

export function parseLang(value: string | null | undefined): Lang | null {
  return value === "de" || value === "en" ? value : null;
}

/** Text in der gewählten Sprache: tr(lang, "Abbrechen", "Cancel"). */
export function tr(lang: Lang, de: string, en: string): string {
  return lang === "en" ? en : de;
}

export function localeOf(lang: Lang): string {
  return lang === "en" ? "en-US" : "de-AT";
}
