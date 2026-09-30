"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import {
  deleteSoloPitch,
  updateSoloPitch,
  type DeleteSoloPitchState,
  type UpdateSoloPitchFormState,
} from "@/app/actions/solo-pitch";
import { FormError, SubmitButton } from "@/components/ui";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";
import { AiContentCheckbox } from "@/components/pitches/ai-content-checkbox";
import type { FeedSoloPitch } from "@/lib/feed";

type Screen = "closed" | "menu" | "edit" | "delete";

/**
 * Phase 32: a classic "⋮" overflow menu — replaces two always-visible
 * Bearbeiten/Löschen buttons that used to eat space under every one of your
 * own videos (Luca's report). FeedSoloPitchCard swaps this in for
 * ReportButton whenever `pitch.viewerOwnsThisBrand` is true, so it appears
 * identically wherever that card is rendered (main feed or a profile grid's
 * single-post view).
 */
export function SoloPitchOwnerMenuButton({
  pitch,
  onUpdated,
  onDeleted,
}: {
  pitch: FeedSoloPitch;
  onUpdated: (patch: Partial<FeedSoloPitch>) => void;
  onDeleted: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("closed");
  const [description, setDescription] = useState(pitch.description ?? "");
  const [ctaLabel, setCtaLabel] = useState(pitch.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(pitch.ctaUrl ?? "");
  const [containsAiContent, setContainsAiContent] = useState(pitch.containsAiContent);

  const [updateState, updateAction, updatePending] = useActionState<UpdateSoloPitchFormState, FormData>(
    updateSoloPitch,
    undefined,
  );
  const [deleteState, deleteAction, deletePending] = useActionState<DeleteSoloPitchState, FormData>(
    deleteSoloPitch,
    undefined,
  );
  const wasUpdatePending = useRef(false);
  const wasDeletePending = useRef(false);

  // Same pending->done transition pattern as reaction-upload-form.tsx.
  useEffect(() => {
    if (wasUpdatePending.current && !updatePending && updateState?.success) {
      onUpdated({ description, ctaLabel, ctaUrl, containsAiContent });
      setScreen("closed");
    }
    wasUpdatePending.current = updatePending;
  }, [updatePending, updateState, description, ctaLabel, ctaUrl, containsAiContent, onUpdated]);

  useEffect(() => {
    if (wasDeletePending.current && !deletePending && deleteState === undefined) {
      onDeleted();
    }
    wasDeletePending.current = deletePending;
  }, [deletePending, deleteState, onDeleted]);

  function openMenu() {
    setDescription(pitch.description ?? "");
    setCtaLabel(pitch.ctaLabel ?? "");
    setCtaUrl(pitch.ctaUrl ?? "");
    setContainsAiContent(pitch.containsAiContent);
    setScreen("menu");
  }

  return (
    <>
      <button onClick={openMenu} aria-label="Mehr" className="pointer-events-auto flex flex-col items-center gap-1 text-white">
        <MoreVertical size={28} />
      </button>

      {screen !== "closed" &&
        // Phase 43: a bumped z-index (z-50 -> z-[60]) wasn't actually
        // enough — this button lives inside a card that can itself be shown
        // inside StandaloneSoloPitchFeed's own fixed overlay, which also
        // renders its own local <BottomNav>. Verified on real WebKit (iOS
        // Simulator, not just the desktop browser this was first "fixed"
        // in): the sheet *painted* on top correctly, but taps still landed
        // on the video/BottomNav underneath — nested `position: fixed`
        // elements don't reliably share one flat stacking order across
        // engines, no z-index fixes that. A portal to `document.body`
        // sidesteps it entirely: a real top-level DOM sibling of everything
        // else, so paint and hit-testing finally agree, on every engine.
        // Luca: "Bearbeiten/Löschen unsichtbar, klickt stattdessen die Tabs
        // dahinter."
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setScreen("closed")}>
          <div
            className="w-full rounded-t-2xl bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {screen === "menu" && (
              <div className="space-y-1.5">
                <button
                  onClick={() => setScreen("edit")}
                  className="w-full rounded-lg border border-zinc-800 px-3 py-2.5 text-left text-sm text-white"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => setScreen("delete")}
                  className="w-full rounded-lg border border-red-500/40 px-3 py-2.5 text-left text-sm text-red-400"
                >
                  Löschen
                </button>
              </div>
            )}

            {screen === "edit" && (
              <form action={updateAction}>
                <input type="hidden" name="soloPitchId" value={pitch.soloPitchId} />
                <FormError message={updateState?.errors?._form?.[0] ?? updateState?.errors?.description?.[0]} />
                <div className="mb-3">
                  <label
                    htmlFor={`description-${pitch.soloPitchId}`}
                    className="mb-1 block text-sm font-medium text-zinc-300"
                  >
                    Beschreibung
                  </label>
                  <textarea
                    id={`description-${pitch.soloPitchId}`}
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    maxLength={300}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
                  />
                </div>
                <CtaLinkFields
                  errors={updateState?.errors}
                  ctaLabel={ctaLabel}
                  ctaUrl={ctaUrl}
                  onCtaLabelChange={setCtaLabel}
                  onCtaUrlChange={setCtaUrl}
                />
                <div onChange={(e) => setContainsAiContent((e.target as HTMLInputElement).checked)}>
                  <AiContentCheckbox defaultChecked={pitch.containsAiContent} />
                </div>
                <div className="flex gap-2">
                  <SubmitButton>Speichern</SubmitButton>
                  <button
                    type="button"
                    onClick={() => setScreen("menu")}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
                  >
                    Zurück
                  </button>
                </div>
              </form>
            )}

            {screen === "delete" && (
              <div>
                <p className="mb-3 text-sm text-white">Diesen Pitch wirklich löschen?</p>
                {deleteState?.error && <FormError message={deleteState.error} />}
                <form action={deleteAction} className="flex gap-2">
                  <input type="hidden" name="soloPitchId" value={pitch.soloPitchId} />
                  <button
                    type="submit"
                    disabled={deletePending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {deletePending ? "…" : "Ja, löschen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen("menu")}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
                  >
                    Abbrechen
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
