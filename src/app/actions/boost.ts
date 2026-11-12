"use server";

import { localizeResult } from "@/lib/lang";
import { refresh } from "next/cache";
import { requireAdminUser } from "@/lib/moderation";
import { activateBoost, rejectBoost } from "@/lib/boost";

async function activateBoostActionImpl(formData: FormData) {
  await requireAdminUser();
  const boostId = formData.get("boostId");
  if (typeof boostId !== "string" || !boostId) return;
  await activateBoost(boostId);
  refresh();
}

async function rejectBoostActionImpl(formData: FormData) {
  await requireAdminUser();
  const boostId = formData.get("boostId");
  if (typeof boostId !== "string" || !boostId) return;
  await rejectBoost(boostId);
  refresh();
}

// Luca 12.11.: Ergebnisse in der Sprache der Person (siehe lib/lang.ts).
export async function activateBoostAction(...args: Parameters<typeof activateBoostActionImpl>) {
  return localizeResult(await activateBoostActionImpl(...args));
}
export async function rejectBoostAction(...args: Parameters<typeof rejectBoostActionImpl>) {
  return localizeResult(await rejectBoostActionImpl(...args));
}
