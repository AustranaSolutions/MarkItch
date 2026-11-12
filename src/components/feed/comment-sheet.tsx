"use client";

import { shortTimeAgo } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { CommentWithAuthor } from "@/lib/comment";
import { ReportButton } from "@/components/moderation/report-button";
import { useT } from "@/components/i18n/lang-provider";

type CommentRow = Omit<CommentWithAuthor, "createdAt"> & { createdAt: string };

// Phase 13: a comment thread now hangs off either a battle or a solo pitch
// — same UI, different endpoint/body key. `target` carries both the kind
// and the id so this component (and its one caller-visible id, used for
// onCommentPosted) stays a single source of truth instead of two near-
// identical components.
// Phase 40: reactions got the same comment thread — "like/comment/teilen/
// melden sollen überall gleich sein" (Luca).
export type CommentTarget = { kind: "battle"; id: string } | { kind: "solo"; id: string } | { kind: "reaction"; id: string };

const ENDPOINT_BY_KIND: Record<CommentTarget["kind"], { endpoint: string; idParam: string }> = {
  battle: { endpoint: "/api/feed/comments", idParam: "battleId" },
  solo: { endpoint: "/api/pitches/comments", idParam: "soloPitchId" },
  reaction: { endpoint: "/api/pitches/reaction-comments", idParam: "reactionId" },
};

export function CommentSheet({
  target,
  isLoggedIn,
  onClose,
  onCommentPosted,
}: {
  target: CommentTarget;
  isLoggedIn: boolean;
  onClose: () => void;
  onCommentPosted: (id: string) => void;
}) {
  const t = useT();
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const { endpoint, idParam } = ENDPOINT_BY_KIND[target.kind];

  useEffect(() => {
    let cancelled = false;
    fetch(`${endpoint}?${idParam}=${target.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- endpoint/idParam are derived from target.kind, re-runs whenever target.id does
  }, [target.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [idParam]: target.id, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("Meinung konnte nicht gespeichert werden.", "Your comment couldn’t be saved."));
        return;
      }
      setComments(data.comments ?? []);
      setContent("");
      onCommentPosted(target.id);
    } catch {
      setError(t("Meinung konnte nicht gespeichert werden.", "Your comment couldn’t be saved."));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[70%] w-full flex-col rounded-t-2xl bg-zinc-950 pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            {t("Meinungen", "Comments")} {comments && comments.length > 0 ? `(${comments.length})` : ""}
          </h2>
          <button onClick={onClose} aria-label={t("Schließen", "Close")} className="text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {comments === null ? (
            <p className="text-sm text-zinc-600">{t("Lädt…", "Loading…")}</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("Noch keine Meinungen — sag als Erste:r, was du denkst.", "No comments yet — be the first to say what you think.")}</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id}>
                  <div className="flex items-center justify-between">
                    <Link
                      href={c.authorBrand ? `/brands/${c.authorBrand.slug}` : `/users/${c.authorId}`}
                      className="text-sm font-semibold text-white hover:underline"
                    >
                      {c.authorName}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">{shortTimeAgo(c.createdAt, t)}</span>
                      {!c.viewerIsAuthor && (
                        <ReportButton
                          targetType="comment"
                          targetId={c.id}
                          isLoggedIn={isLoggedIn}
                          variant="text"
                          blockOptions={[{ name: c.authorName, target: c.authorBrand ? { brandId: c.authorBrand.id } : { userId: c.authorId } }]}
                        />
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-300">{c.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-800 p-3">
          {isLoggedIn ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              {error && <p className="sr-only">{error}</p>}
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                placeholder={t("Was denkst du?", "What do you think?")}
                className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={posting || !content.trim()}
                className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {posting ? "…" : t("Senden", "Send")}
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-zinc-500">
              <a href="/login" className="text-orange-500 hover:underline">
                {t("Anmelden", "Log in")}
              </a>
              {t(", um zu kommentieren.", ", to comment.")}
            </p>
          )}
          {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
