"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { toggleReminderFor } from "@/lib/reminder";

export type ReminderFormState = { error?: string } | undefined;

/** Toggle a reminder for the current user on one upcoming battle. */
export async function toggleReminder(_prevState: ReminderFormState, formData: FormData): Promise<ReminderFormState> {
  const user = await requireUser();
  const battleId = formData.get("battleId");
  if (typeof battleId !== "string" || !battleId) {
    return { error: "Ungültige Anfrage." };
  }

  // RN-5: Logik in lib/reminder.ts, gemeinsam mit der App-Route.
  await toggleReminderFor(user.id, battleId);

  refresh();
  return undefined;
}
