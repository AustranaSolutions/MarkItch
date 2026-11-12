"use server";

import { localizeResult } from "@/lib/lang";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { acceptCurrentTerms, setNameForUser } from "@/lib/account";

/** Luca 18.10.: Zustimmung zur aktuellen Fassung (Web-Hinweis für angemeldete Konten). */
async function acceptTermsActionImpl(): Promise<void> {
  const user = await requireUser();
  await acceptCurrentTerms(user.id);
  revalidatePath("/", "layout");
}

/** Luca 02.11.: Name nachtragen (Web-Hinweis für ältere Konten ohne Namen). */
async function setNameActionImpl(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string } | undefined> {
  const user = await requireUser();
  const result = await setNameForUser(user.id, { name: formData.get("name") });
  if (!result.ok) return { error: Object.values(result.errors)[0]?.[0] ?? "Speichern fehlgeschlagen." };
  revalidatePath("/", "layout");
  return undefined;
}

// Luca 12.11.: Ergebnisse in der Sprache der Person (siehe lib/lang.ts).
export async function acceptTermsAction(...args: Parameters<typeof acceptTermsActionImpl>) {
  return localizeResult(await acceptTermsActionImpl(...args));
}
export async function setNameAction(...args: Parameters<typeof setNameActionImpl>) {
  return localizeResult(await setNameActionImpl(...args));
}
