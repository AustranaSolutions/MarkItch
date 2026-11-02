"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { acceptCurrentTerms, setNameForUser } from "@/lib/account";

/** Luca 18.10.: Zustimmung zur aktuellen Fassung (Web-Hinweis für angemeldete Konten). */
export async function acceptTermsAction(): Promise<void> {
  const user = await requireUser();
  await acceptCurrentTerms(user.id);
  revalidatePath("/", "layout");
}

/** Luca 02.11.: Name nachtragen (Web-Hinweis für ältere Konten ohne Namen). */
export async function setNameAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string } | undefined> {
  const user = await requireUser();
  const result = await setNameForUser(user.id, { name: formData.get("name") });
  if (!result.ok) return { error: Object.values(result.errors)[0]?.[0] ?? "Speichern fehlgeschlagen." };
  revalidatePath("/", "layout");
  return undefined;
}
