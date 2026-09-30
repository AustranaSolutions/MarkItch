"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { startCastingFor, submitCastingEntryFor, type CastingResult } from "@/lib/casting-manage";

// RN-5d: Logik in lib/casting-manage.ts, gemeinsam mit den App-Routen.

export type StartCastingFormState = { error?: string } | undefined;
export type SubmitCastingFormState = { error?: string } | undefined;

function toFormState(result: CastingResult): { error?: string } | undefined {
  if (!result.ok) return { error: result.error };
  refresh();
  return undefined;
}

export async function startCasting(_prevState: StartCastingFormState, formData: FormData): Promise<StartCastingFormState> {
  const user = await requireUser();
  return toFormState(await startCastingFor(user, formData.get("prompt")));
}

export async function submitCastingEntry(
  _prevState: SubmitCastingFormState,
  formData: FormData,
): Promise<SubmitCastingFormState> {
  const user = await requireUser();
  return toFormState(await submitCastingEntryFor(user, formData));
}
