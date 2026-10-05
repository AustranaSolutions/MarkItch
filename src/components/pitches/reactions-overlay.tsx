"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { buildReactionThreads, type ReactionRow } from "@/lib/reaction-threads";
import { ReactionsGrid } from "@/components/pitches/reactions-grid";
import { ReactionsFeed } from "@/components/pitches/reactions-feed";
import { ReactionUploadForm } from "@/components/pitches/reaction-upload-form";
import { CommentSheet, type CommentTarget } from "@/components/feed/comment-sheet";

/**
 * Phase 40: replaces the old direct full-screen scroll entry — Luca: "wie
 * bei TikTok, wenn man auf den Sound-Button klickt" (a tile grid first),
 * "dann sieht man ... die Videokacheln von allen die darauf reagiert
 * haben ... dann muss man nicht 100 Videos einzeln durchscrollen." Owns
 * fetching + the one upload sheet (shared by "post a new reaction" and
 * "reply to this reaction") so the grid and the scoped feed underneath it
 * can both stay simple/presentational.
 */
export function ReactionsOverlay({
  soloPitchId,
  isLoggedIn,
  canPostReaction,
  canPromote,
  viewerBrandId,
  onClose,
  onReactionCountChange,
}: {
  soloPitchId: string;
  isLoggedIn: boolean;
  canPostReaction: boolean;
  canPromote: boolean;
  viewerBrandId?: string | null;
  onClose: () => void;
  onReactionCountChange: (soloPitchId: string, count: number) => void;
}) {
  const [reactions, setReactions] = useState<ReactionRow[] | null>(null);
  const [view, setView] = useState<"grid" | "feed">("grid");
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  // undefined = closed, null = new top-level reaction, string = reply to that reaction id
  const [uploadParentId, setUploadParentId] = useState<string | null | undefined>(undefined);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);

  const load = useCallback(() => {
    fetch(`/api/pitches/reactions?soloPitchId=${soloPitchId}`)
      .then((res) => res.json())
      .then((data) => {
        const list: ReactionRow[] = data.reactions ?? [];
        setReactions(list);
        onReactionCountChange(soloPitchId, list.length);
      })
      .catch(() => setReactions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onReactionCountChange is a stable setter from the parent
  }, [soloPitchId]);

  useEffect(() => {
    load();
  }, [load]);

  const threads = useMemo(() => buildReactionThreads(reactions ?? []), [reactions]);

  async function handleToggleLike(reactionId: string) {
    setReactions((prev) =>
      prev?.map((r) => (r.id === reactionId ? { ...r, viewerLiked: !r.viewerLiked, likeCount: r.likeCount + (r.viewerLiked ? -1 : 1) } : r)) ?? null,
    );
    try {
      const res = await fetch("/api/pitches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setReactions((prev) => prev?.map((r) => (r.id === reactionId ? { ...r, viewerLiked: data.liked, likeCount: data.count } : r)) ?? null);
      } else {
        load();
      }
    } catch {
      load();
    }
  }

  function handleShare(reaction: ReactionRow) {
    // No dedicated reaction page exists — opens the pitch it belongs to,
    // same fallback the notification link uses.
    const url = `${window.location.origin}/?pitch=${reaction.soloPitchId}`;
    const shareData = { title: `${reaction.brand?.name ?? reaction.community?.name ?? "Reaktion"} auf MarkItch`, url };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
  }

  if (reactions === null) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black">
        <p className="text-sm text-zinc-500">Lädt…</p>
      </div>
    );
  }

  return (
    <>
      {view === "grid" ? (
        <ReactionsGrid
          topLevel={threads.topLevel}
          replyCountById={threads.replyCountById}
          canPostReaction={canPostReaction}
          onClose={onClose}
          onOpenReaction={(reactionId) => {
            setFeedStartIndex(threads.startIndexById.get(reactionId) ?? 0);
            setView("feed");
          }}
          onPostNew={() => setUploadParentId(null)}
        />
      ) : (
        <ReactionsFeed
          reactions={threads.flattened}
          isLoggedIn={isLoggedIn}
          canPromote={canPromote}
          viewerBrandId={viewerBrandId}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onToggleLike={handleToggleLike}
          onReply={(reactionId) => setUploadParentId(reactionId)}
          onOpenComments={(reactionId) => setCommentTarget({ kind: "reaction", id: reactionId })}
          onShare={handleShare}
          startIndex={feedStartIndex}
          onClose={onClose}
          onBackToGrid={() => setView("grid")}
        />
      )}

      {commentTarget && (
        // CommentSheet positions itself with `absolute inset-0` expecting a
        // positioned full-screen ancestor (feed-client.tsx's own relative
        // column normally provides that) — this overlay has no such
        // wrapper, and its own z-30 would otherwise render *behind*
        // ReactionsFeed's z-[60].
        <div className="fixed inset-0 z-[80]">
          <CommentSheet
            target={commentTarget}
            isLoggedIn={isLoggedIn}
            onClose={() => setCommentTarget(null)}
            onCommentPosted={(id) =>
              setReactions((prev) => prev?.map((r) => (r.id === id ? { ...r, commentCount: r.commentCount + 1 } : r)) ?? null)
            }
          />
        </div>
      )}

      {uploadParentId !== undefined && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/60" onClick={() => setUploadParentId(undefined)}>
          <div className="w-full rounded-t-2xl bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{uploadParentId ? "Antworten" : "Reaktion posten"}</h2>
              <button onClick={() => setUploadParentId(undefined)} aria-label="Schließen" className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <ReactionUploadForm
              soloPitchId={soloPitchId}
              parentReactionId={uploadParentId}
              onPosted={() => {
                setUploadParentId(undefined);
                load();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
