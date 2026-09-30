"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { postCreatorVideoFor } from "@/lib/creator-video";

// RN-5d: Logik in lib/creator-video.ts, gemeinsam mit der App-Route.

export type PostCreatorVideoFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

export async function postCreatorVideo(
  _prevState: PostCreatorVideoFormState,
  formData: FormData,
): Promise<PostCreatorVideoFormState> {
  const user = await requireUser();
  const result = await postCreatorVideoFor(user, formData);
  if (!result.ok) return { errors: result.errors };
  refresh();
  return { success: true };
}
