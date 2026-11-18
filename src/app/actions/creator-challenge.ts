"use server";

import { localizeResult } from "@/lib/lang";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { submitToChallengeFor } from "@/lib/creator-challenge";

// RN-7: Creator-Challenge im Web — Logik in lib/creator-challenge.ts, gemeinsam mit der App.

export type ChallengeEntryFormState = { errors?: Record<string, string[]> } | undefined;

async function submitChallengeEntryImpl(
  _prevState: ChallengeEntryFormState,
  formData: FormData,
): Promise<ChallengeEntryFormState> {
  const user = await requireUser();
  const challengeId = formData.get("challengeId");
  if (typeof challengeId !== "string" || !challengeId) return { errors: { _form: ["Ungültige Anfrage."] } };
  const result = await submitToChallengeFor(user, challengeId, formData);
  if (!result.ok) return { errors: result.errors };
  refresh();
  redirect(`/challenges/${challengeId}`);
}

export async function submitChallengeEntry(...args: Parameters<typeof submitChallengeEntryImpl>) {
  return localizeResult(await submitChallengeEntryImpl(...args));
}
