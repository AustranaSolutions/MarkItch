"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { markAllNotificationsReadFor } from "@/lib/notification";

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsReadFor(user.id);
  refresh();
}
