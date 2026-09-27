"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { toggleFollowForUser } from "@/lib/follow";

export type FollowFormState = { error?: string } | undefined;

/** Toggle follow/unfollow for the current user on one brand. */
export async function toggleFollow(_prevState: FollowFormState, formData: FormData): Promise<FollowFormState> {
  const user = await requireUser();
  const brandId = formData.get("brandId");
  if (typeof brandId !== "string" || !brandId) {
    return { error: "Ungültige Anfrage." };
  }

  // Phase 35 / RN-3: Logik liegt in lib/follow.ts, damit die App-Route
  // (/api/follow) exakt dasselbe tut.
  await toggleFollowForUser(user.id, brandId);

  refresh();
  return undefined;
}
