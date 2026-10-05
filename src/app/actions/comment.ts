"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { battles, comments } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { checkComment } from "@/lib/comment-filter";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";

export type CommentFormState = { error?: string } | undefined;

/** Anyone signed in can comment — Acro or Assent, including a Pitch's own brands. */
export async function postComment(_prevState: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const user = await requireUser();
  const battleId = formData.get("battleId");
  const content = formData.get("content");

  if (typeof battleId !== "string" || !battleId) {
    return { error: "Ungültige Anfrage." };
  }

  const [battle] = await db
    .select({ id: battles.id, brandAId: battles.brandAId, brandBId: battles.brandBId })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);
  if (!battle) {
    return { error: "Dieser Pitch existiert nicht." };
  }

  // Phase F: Kommentarfilter (Wortliste, Links, Doppelposts, Limit).
  const checked = await checkComment(user.id, content);
  if (!checked.ok) {
    return { error: checked.error };
  }
  await db.insert(comments).values({ battleId, userId: user.id, content: checked.content });
  const [memberIdsA, memberIdsB, actor] = await Promise.all([
    getBrandMemberUserIds(battle.brandAId),
    getBrandMemberUserIds(battle.brandBId),
    getActorLabel(user.id),
  ]);
  await notifyUsers([...memberIdsA, ...memberIdsB], `${actor.label} hat dein Duell kommentiert.`, `/?battle=${battleId}`, user.id);

  refresh();
  return undefined;
}
