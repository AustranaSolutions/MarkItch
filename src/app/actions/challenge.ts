"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  cancelChallengeFor,
  respondToChallengeFor,
  sendChallengeFor,
  sendChallengeFromSoloPitchFor,
  type ChallengeResult,
} from "@/lib/challenge-manage";

// RN-5b: die eigentliche Logik (Prüfungen, Benachrichtigungen, Duell
// anlegen) steht in lib/challenge-manage.ts, gemeinsam mit den App-Routen.

export type ChallengeFormState = { error?: string } | undefined;
export type CancelFormState = { error?: string } | undefined;
export type RespondFormState = { error?: string } | undefined;

function toFormState(result: ChallengeResult): { error?: string } | undefined {
  if (!result.ok) return { error: result.error };
  refresh();
  return undefined;
}

/** Brand A challenges Brand B. Triggered from B's public profile page. */
export async function sendChallenge(_prevState: ChallengeFormState, formData: FormData): Promise<ChallengeFormState> {
  const user = await requireUser();
  return toFormState(
    await sendChallengeFor(user, { challengedBrandId: formData.get("challengedBrandId"), category: formData.get("category") }),
  );
}

/** Phase 13: "Duell einladen" direkt von einem Solo-Pitch aus. */
export async function sendChallengeFromSoloPitch(
  _prevState: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const user = await requireUser();
  return toFormState(
    await sendChallengeFromSoloPitchFor(user, { soloPitchId: formData.get("soloPitchId"), category: formData.get("category") }),
  );
}

/** The challenger withdraws their own still-pending invitation. */
export async function cancelChallenge(_prevState: CancelFormState, formData: FormData): Promise<CancelFormState> {
  const user = await requireUser();
  return toFormState(await cancelChallengeFor(user, formData.get("challengeId")));
}

/** The challenged brand accepts or declines. */
export async function respondToChallenge(_prevState: RespondFormState, formData: FormData): Promise<RespondFormState> {
  const user = await requireUser();
  return toFormState(await respondToChallengeFor(user, formData.get("challengeId"), formData.get("decision")));
}
