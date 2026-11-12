"use client";

import { shortTimeAgo } from "@/lib/i18n";
import Link from "next/link";
import { useActionState } from "react";
import { postComment, type CommentFormState } from "@/app/actions/comment";
import { FormError, SubmitButton } from "@/components/ui";
import type { CommentWithAuthor } from "@/lib/comment";
import { useT } from "@/components/i18n/lang-provider";

export function CommentSection({
  battleId,
  comments,
  isLoggedIn,
}: {
  battleId: string;
  comments: CommentWithAuthor[];
  isLoggedIn: boolean;
}) {
  const t = useT();
  const [state, action] = useActionState<CommentFormState, FormData>(postComment, undefined);

  return (
    <div className="mx-auto mt-8 w-full max-w-[380px]">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-400">
        {t("KOMMENTARE", "COMMENTS")} {comments.length > 0 && `(${comments.length})`}
      </h2>

      {isLoggedIn ? (
        // key={comments.length}: after a successful post, refresh() re-fetches
        // the comment list with one more entry, which remounts this
        // uncontrolled form and clears the textarea — cheaper than wiring up
        // a separate "was that submit a success" signal just to reset it.
        <form key={comments.length} action={action} className="mb-4">
          <input type="hidden" name="battleId" value={battleId} />
          <FormError message={state?.error} />
          <textarea
            name="content"
            required
            maxLength={500}
            placeholder={t("Was denkst du?", "What do you think?")}
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
          />
          <div className="mt-2">
            <SubmitButton>{t("Kommentieren", "Comment")}</SubmitButton>
          </div>
        </form>
      ) : (
        <p className="mb-4 text-sm text-zinc-500">
          <a href="/login" className="text-orange-500 hover:underline">
            {t("Anmelden", "Log in")}
          </a>
          {t(", um zu kommentieren.", ", to comment.")}
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-zinc-600">{t("Noch keine Meinungen — sag als Erste:r, was du denkst.", "No comments yet — be the first to say what you think.")}</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-zinc-800 p-3">
              <div className="flex items-center justify-between">
                <Link
                      href={c.authorBrand ? `/brands/${c.authorBrand.slug}` : `/users/${c.authorId}`}
                      className="text-sm font-semibold text-white hover:underline"
                    >
                      {c.authorName}
                    </Link>
                <span className="text-xs text-zinc-600">{shortTimeAgo(c.createdAt, t)}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-300">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
