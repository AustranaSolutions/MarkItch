"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { acceptCurrentTerms } from "@/lib/account";

/** Luca 18.10.: Zustimmung zur aktuellen Fassung (Web-Hinweis für angemeldete Konten). */
export async function acceptTermsAction(): Promise<void> {
  const user = await requireUser();
  await acceptCurrentTerms(user.id);
  revalidatePath("/", "layout");
}
