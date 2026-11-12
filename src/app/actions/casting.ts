"use server";

import { localizeResult } from "@/lib/lang";
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

async function startCastingImpl(_prevState: StartCastingFormState, formData: FormData): Promise<StartCastingFormState> {
  const user = await requireUser();
  return toFormState(await startCastingFor(user, formData.get("prompt"), formData.get("days")));
}

async function submitCastingEntryImpl(
  _prevState: SubmitCastingFormState,
  formData: FormData,
): Promise<SubmitCastingFormState> {
  const user = await requireUser();
  return toFormState(await submitCastingEntryFor(user, formData));
}

// Luca 12.11.: Ergebnisse in der Sprache der Person (siehe lib/lang.ts).
export async function startCasting(...args: Parameters<typeof startCastingImpl>) {
  return localizeResult(await startCastingImpl(...args));
}
export async function submitCastingEntry(...args: Parameters<typeof submitCastingEntryImpl>) {
  return localizeResult(await submitCastingEntryImpl(...args));
}
