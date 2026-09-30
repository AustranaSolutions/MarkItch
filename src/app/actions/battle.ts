"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { submitBattleVideoFor } from "@/lib/battle-video";

export type UploadBattleVideoFormState = { error?: string } | undefined;

/**
 * Scheduled-mode: one of the two brands in an 'awaiting_videos' battle
 * uploads their side. Once both sides are in, activateBattleIfBothSidesReady
 * opens voting and fires the follower notification.
 *
 * Phase 29: the video itself was already uploaded client-side directly to
 * storage by the time this runs (see video-picker-input.tsx) — this only
 * ever receives the resulting URL, never the file.
 */
export async function uploadBattleVideo(
  _prevState: UploadBattleVideoFormState,
  formData: FormData,
): Promise<UploadBattleVideoFormState> {
  const user = await requireUser();
  const battleId = formData.get("battleId");
  if (typeof battleId !== "string" || !battleId) {
    return { error: "Ungültige Anfrage." };
  }

  // RN-5b: Logik in lib/battle-video.ts, gemeinsam mit der App-Route.
  const result = await submitBattleVideoFor(user, battleId, formData);
  if (!result.ok) {
    return { error: result.error };
  }

  refresh();
  // Phase 30: redirect instead of just returning — the waiting-room page
  // (/pitches/[id]) already shows "eingereicht, warte auf Gegenseite" or
  // bounces straight into the live feed if the other side was already in,
  // so re-rendering it here is exactly the right next screen and also
  // makes a second click impossible (this form unmounts).
  redirect(`/pitches/${battleId}`);
}

// Phase 40: the old "Antworten"/counterWithVideo open-mode path (immediate,
// no accept step, only usable against a brand's legacy videoUrl) is gone —
// folded into the same "Duell einladen" → accept → produce flow as every
// other invite (see actions/challenge.ts's respondToChallenge, which now
// prefills from a brand's legacy videoUrl the same way it already did for
// a solo pitch). One consistent path instead of two different mechanics.
