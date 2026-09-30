"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { openChallengeFor, submitToChallengeFor } from "@/lib/creator-challenge";

// RN-7: Creator-Challenge im Web — Logik in lib/creator-challenge.ts, gemeinsam mit der App.

export type OpenChallengeFormState = { error?: string } | undefined;

export async function openChallenge(_prevState: OpenChallengeFormState, formData: FormData): Promise<OpenChallengeFormState> {
  const user = await requireUser();
  const result = await openChallengeFor(user, { period: formData.get("period"), prompt: formData.get("prompt") });
  if (!result.ok) return { error: result.error };
  redirect(`/challenges/${result.challengeId}`);
}

export type ChallengeEntryFormState = { errors?: Record<string, string[]> } | undefined;

export async function submitChallengeEntry(
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
