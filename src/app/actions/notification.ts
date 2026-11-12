"use server";

import { localizeResult } from "@/lib/lang";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { markAllNotificationsReadFor } from "@/lib/notification";

async function markAllNotificationsReadImpl(): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsReadFor(user.id);
  refresh();
}

// Luca 12.11.: Ergebnisse in der Sprache der Person (siehe lib/lang.ts).
export async function markAllNotificationsRead(...args: Parameters<typeof markAllNotificationsReadImpl>) {
  return localizeResult(await markAllNotificationsReadImpl(...args));
}
