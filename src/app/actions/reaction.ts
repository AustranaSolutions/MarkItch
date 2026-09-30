"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { postReactionFor, promoteReactionFor } from "@/lib/reaction-manage";

// RN-5c: Logik in lib/reaction-manage.ts, gemeinsam mit den App-Routen.

export type ReactionFormState = { error?: string } | undefined;

export async function postReaction(_prevState: ReactionFormState, formData: FormData): Promise<ReactionFormState> {
  const user = await requireUser();
  const result = await postReactionFor(user, formData);
  if (!result.ok) return { error: result.error };
  refresh();
  return undefined;
}

export type PromoteReactionFormState = { error?: string } | undefined;

/** The original brand upgrades a reaction straight to an official Duell. */
export async function promoteReaction(
  _prevState: PromoteReactionFormState,
  formData: FormData,
): Promise<PromoteReactionFormState> {
  const user = await requireUser();
  const result = await promoteReactionFor(user, formData.get("reactionId"));
  if (!result.ok) return { error: result.error };
  redirect(`/pitches/${result.battleId}`);
}
