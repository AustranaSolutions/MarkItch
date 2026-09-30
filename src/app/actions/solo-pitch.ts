"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { createSoloPitchForUser, deleteOwnSoloPitch, updateOwnSoloPitch } from "@/lib/solo-pitch";

export type SoloPitchFormState = { errors?: Record<string, string[]> } | undefined;

/**
 * Phase 13: post a new solo pitch — a normal, opponent-free feed post. This
 * is the entry point that solves the "a video needs an already-arranged
 * Duell to exist at all" problem (see CLAUDE-CODE-UEBERGABE.md §6): every
 * video starts here, a Duell is something that can happen to it later
 * (challenge or promoted reaction), never a precondition for posting.
 *
 * Phase 29: the video itself was already uploaded client-side directly to
 * storage by the time this runs (see video-picker-input.tsx) — this only
 * ever receives the resulting URL, never the file.
 *
 * Phase 30: redirects straight into the feed on success instead of
 * returning a `success` flag — Luca's report: the form used to just sit
 * there with a green message, submit button clickable again, so a second
 * click posted the same video twice. A `redirect()` unmounts this form
 * entirely (same fix already used by counterWithVideo/promoteReaction), so
 * there's nothing left to double-submit.
 */
export async function postSoloPitch(_prevState: SoloPitchFormState, formData: FormData): Promise<SoloPitchFormState> {
  const user = await requireUser();
  // RN-4c: Logik in lib/solo-pitch.ts, gemeinsam mit der App-Route.
  const result = await createSoloPitchForUser(user.id, formData);
  if (!result.ok) {
    return { errors: result.errors };
  }

  refresh();
  // Phase 41: `posted=1` alone reset the scroll position but didn't
  // guarantee the just-posted video was the first thing there — the feed's
  // interleave cadence (see feed.ts's SOLO_INTERLEAVE_EVERY) places even
  // the newest solo pitch at the first *solo* slot, which is the 3rd item
  // overall, not the 1st. Luca: "es ist das letzte gepostete, müsste im
  // Feed sein." Passing its id reuses the existing share-link deep-link
  // mechanism (page.tsx) to pin it to the very top for the poster, without
  // changing how the feed ranks for anyone else.
  redirect(`/?posted=1&pitch=${result.id}`);
}

export type UpdateSoloPitchFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

/** Owner-only edit of a solo pitch's caption + CTA link — never the video file itself (re-upload is a new post). */
export async function updateSoloPitch(
  _prevState: UpdateSoloPitchFormState,
  formData: FormData,
): Promise<UpdateSoloPitchFormState> {
  const user = await requireUser();
  const soloPitchId = formData.get("soloPitchId");
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return { errors: { _form: ["Ungültige Anfrage."] } };
  }

  // RN-3: Logik in lib/solo-pitch.ts, damit die App-Route dieselbe nutzt.
  const result = await updateOwnSoloPitch(user.id, soloPitchId, {
    description: formData.get("description"),
    ctaLabel: formData.get("ctaLabel"),
    ctaUrl: formData.get("ctaUrl"),
  });
  if (!result.ok) {
    return { errors: result.errors };
  }

  refresh();
  return { success: true };
}

export type DeleteSoloPitchState = { error?: string } | undefined;

/** Owner-only self-service delete — separate from the admin moderation removal path (moderation.ts), which needs no ownership check. */
export async function deleteSoloPitch(_prevState: DeleteSoloPitchState, formData: FormData): Promise<DeleteSoloPitchState> {
  const user = await requireUser();
  const soloPitchId = formData.get("soloPitchId");
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return { error: "Ungültige Anfrage." };
  }

  const result = await deleteOwnSoloPitch(user.id, soloPitchId);
  if (!result.ok) {
    return { error: result.error };
  }
  refresh();
  return undefined;
}
