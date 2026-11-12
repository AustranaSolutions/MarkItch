import "server-only";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { langFromAcceptLanguage } from "@/lib/i18n";
import { translateErrorBody } from "@/lib/server-messages";

/**
 * Luca 12.11.: Fehlerantwort der API in der Sprache des Aufrufers (App schickt
 * Accept-Language mit). Gleiche Signatur wie NextResponse.json.
 */
export async function apiError<T extends { error?: unknown; fieldErrors?: unknown }>(body: T, init?: ResponseInit) {
  const lang = langFromAcceptLanguage((await headers()).get("accept-language"));
  return NextResponse.json(translateErrorBody(body, lang), init);
}
