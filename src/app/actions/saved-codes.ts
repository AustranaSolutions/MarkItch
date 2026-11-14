"use server";

import { refresh } from "next/cache";
import { getOptionalUser, requireUser } from "@/lib/session";
import { deleteSavedCode, saveCode } from "@/lib/saved-codes";

// Luca 13.11. (Phase 3): „Meine Codes“ (siehe lib/saved-codes.ts).

/** Beim Antippen des Link-Knopfs — ohne Anmeldung passiert nichts (Code ist trotzdem kopiert). */
export async function saveCodeAction(input: { targetType: "pitch" | "battle"; targetId: string; brandId: string }) {
  const user = await getOptionalUser();
  if (!user) return { ok: false };
  return saveCode(user.id, input);
}

export async function deleteSavedCodeAction(formData: FormData) {
  const user = await requireUser();
  await deleteSavedCode(user.id, formData.get("id"));
  refresh();
}
