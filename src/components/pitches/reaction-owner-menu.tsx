"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { ThumbnailEditor, uploadThumbnail } from "@/components/thumbnail-editor";
import { TrimEditor, saveTrim } from "@/components/trim-editor";
import type { ReactionRow } from "@/lib/reaction-threads";
import { useT } from "@/components/i18n/lang-provider";

// Luca 02.11.: ⋯ an der eigenen Reaktion — wie in der App und wie bei Pitches:
// Titelbild ändern, Video kürzen, Löschen (vorher nur Melden, auch an eigenen).

type Screen = "closed" | "menu" | "thumbnail" | "trim" | "delete";

export function ReactionOwnerMenu({ reaction }: { reaction: ReactionRow }) {
  const t = useT();
  const [screen, setScreen] = useState<Screen>("closed");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/mobile/reactions/${reaction.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      window.location.reload();
      return;
    }
    const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setError(data?.error ?? t("Löschen nicht möglich.", "Couldn’t delete."));
    setBusy(false);
  };

  return (
    <>
      <button onClick={() => setScreen("menu")} aria-label={t("Mehr", "More")} className="pointer-events-auto flex flex-col items-center gap-1 text-white">
        <MoreVertical size={28} />
      </button>

      {screen === "thumbnail" && (
        <ThumbnailEditor
          src={reaction.videoUrl}
          remote
          onClose={() => setScreen("closed")}
          onPicked={async (image) => {
            await uploadThumbnail(reaction.videoUrl, image, t);
          }}
        />
      )}
      {screen === "trim" && (
        <TrimEditor
          src={reaction.videoUrl}
          initial={reaction.trim}
          onClose={() => setScreen("closed")}
          onDone={async (value) => {
            await saveTrim(reaction.videoUrl, value, t);
            window.location.reload();
          }}
        />
      )}

      {(screen === "menu" || screen === "delete") &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setScreen("closed")}>
            <div className="w-full rounded-t-2xl bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]" onClick={(e) => e.stopPropagation()}>
              {screen === "menu" ? (
                <div className="space-y-1.5">
                  <button onClick={() => setScreen("thumbnail")} className="w-full rounded-lg border border-zinc-800 px-3 py-2.5 text-left text-sm text-white">
                    {t("Titelbild ändern", "Change cover")}
                  </button>
                  <button onClick={() => setScreen("trim")} className="w-full rounded-lg border border-zinc-800 px-3 py-2.5 text-left text-sm text-white">
                    {t("Video kürzen", "Trim video")}
                  </button>
                  <button onClick={() => setScreen("delete")} className="w-full rounded-lg border border-red-500/40 px-3 py-2.5 text-left text-sm text-red-400">
                    {t("Löschen", "Delete")}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-sm font-semibold text-white">{t("Diese Reaktion wirklich löschen?", "Really delete this reaction?")}</p>
                  <p className="mb-3 text-xs text-zinc-400">{t("Antworten darauf verschwinden mit.", "Replies to it will be removed too.")}</p>
                  {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setScreen("closed")} className="flex-1 rounded-full border border-zinc-700 py-2 text-sm text-white">
                      {t("Abbrechen", "Cancel")}
                    </button>
                    <button onClick={remove} disabled={busy} className="flex-1 rounded-full bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {busy ? "…" : t("Ja, löschen", "Yes, delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
