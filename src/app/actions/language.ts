"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { LANG_COOKIE, parseLang } from "@/lib/i18n";

/** Luca 12.11.: Sprach-Umschalter — "system" folgt wieder der Browsersprache. */
export async function setLanguage(value: string) {
  const store = await cookies();
  const lang = parseLang(value);
  if (lang) store.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  else store.delete(LANG_COOKIE);
  refresh();
}
