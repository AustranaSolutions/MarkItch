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

/** Übersetzer-Funktion, wie sie useT() / getT() liefern — für Hilfsfunktionen als Parameter. */
export type Translate = (de: string, en: string) => string;

/** „vor 5min“ / „5m ago“ — kurze Zeitangabe für Kommentare und Benachrichtigungen. */
export function shortTimeAgo(value: Date | string, t: Translate): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / (60 * 1000));
  if (minutes < 1) return t("gerade eben", "just now");
  if (minutes < 60) return t(`vor ${minutes}min`, `${minutes}m ago`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(`vor ${hours}h`, `${hours}h ago`);
  const days = Math.floor(hours / 24);
  return t(`vor ${days}d`, `${days}d ago`);
}

// Duell-Aufgaben und Meldegründe sind in der Datenbank deutsch gespeichert.
const DUEL_CATEGORY_EN: Record<string, string> = {
  "Verkaufe dein Produkt oder deine Leistung in 15 Sekunden": "Sell your product or service in 15 seconds",
  "One Take — kein Schnitt, eine durchgehende Einstellung": "One take — no cuts, one continuous shot",
  "Mache einen 1-Minuten-Pitch": "Make a 1-minute pitch",
  "Im Stil eines Kinofilms": "In the style of a movie",
  "Im Comic-Stil": "Comic style",
  "Wie eine 90er-Werbung": "Like a 90s commercial",
  "Wie ein Musikvideo": "Like a music video",
  "Wie eine Nachrichtensendung": "Like a news broadcast",
};

export function duelCategoryLabel(category: string, lang: Lang): string {
  return lang === "en" ? (DUEL_CATEGORY_EN[category] ?? category) : category;
}

const REPORT_REASON_EN: Record<string, string> = {
  "Unangemessener Inhalt": "Inappropriate content",
  "Spam oder Betrug": "Spam or scam",
  "Beleidigung oder Belästigung": "Insults or harassment",
  "Musik ohne Rechte": "Music without rights",
  Urheberrechtsverletzung: "Copyright infringement",
  Sonstiges: "Other",
};

export function reportReasonLabel(reason: string, lang: Lang): string {
  return lang === "en" ? (REPORT_REASON_EN[reason] ?? reason) : reason;
}

/** Ländernamen der Marken-Formulare. */
export function countryLabel(code: string, t: Translate): string {
  const map: Record<string, string> = {
    AT: t("Österreich", "Austria"),
    DE: t("Deutschland", "Germany"),
    CH: t("Schweiz", "Switzerland"),
    Other: t("Andere", "Other"),
  };
  return map[code] ?? code;
}

/** Sprache eines Übersetzers — für Hilfsfunktionen, die eine Lang erwarten. */
export const langOf = (t: Translate): Lang => (t("de", "en") === "en" ? "en" : "de");

/** Luca 13.11.: Likes/Meinungen erst ab 10 als Zahl, darunter nur das Symbol (App: socialCount in lib/i18n.ts). */
export const VISIBLE_COUNT_MIN = 10;

export function socialCount(n: number, lang: Lang): string | null {
  return n >= VISIBLE_COUNT_MIN ? n.toLocaleString(localeOf(lang)) : null;
}

/** Kurz für Kacheln: 950, 1,2K, 3,4 Mio. (en: 1.2K, 3.4M) — wie in der App. */
export function compactNumber(n: number, lang: Lang): string {
  if (n < 1000) return String(n);
  const [value, suffix] = n < 1_000_000 ? [n / 1000, "K"] : [n / 1_000_000, lang === "en" ? "M" : " Mio."];
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded.toLocaleString(localeOf(lang))}${suffix}`;
}
