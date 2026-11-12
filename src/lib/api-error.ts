import "server-only";
import { NextResponse } from "next/server";
import { getLang } from "@/lib/lang";
import { translateErrorBody } from "@/lib/server-messages";

/**
 * Luca 12.11.: Fehlerantwort der API in der Sprache des Aufrufers — Website:
 * gewählte Sprache (Cookie) bzw. Browser; App: Accept-Language. Gleiche
 * Signatur wie NextResponse.json.
 */
export async function apiError<T extends { error?: unknown; fieldErrors?: unknown }>(body: T, init?: ResponseInit) {
  return NextResponse.json(translateErrorBody(body, await getLang()), init);
}
