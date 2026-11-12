"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { postReaction, type ReactionFormState } from "@/app/actions/reaction";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";
import { AudioRightsCheckbox } from "@/components/pitches/audio-rights-checkbox";
import { AiContentCheckbox } from "@/components/pitches/ai-content-checkbox";
import { useT } from "@/components/i18n/lang-provider";

export function ReactionUploadForm({
  soloPitchId,
  parentReactionId,
  onPosted,
}: {
  soloPitchId: string;
  parentReactionId?: string | null;
  onPosted: () => void;
}) {
  const t = useT();
  const [state, action, isPending] = useActionState<ReactionFormState, FormData>(postReaction, undefined);
  const wasPending = useRef(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);

  // postReaction returns `undefined` on success (same contract as
  // sendChallenge/counterWithVideo's non-error paths) — refresh() already
  // updates server-rendered data, but this sheet's reaction list is loaded
  // client-side, so the parent still needs telling to refetch it. Only fire
  // on an actual pending->done transition, not on mount (state also starts
  // out `undefined`).
  useEffect(() => {
    if (wasPending.current && !isPending && state === undefined) onPosted();
    wasPending.current = isPending;
  }, [isPending, state, onPosted]);

  // Phase 29: the video is already uploaded (directly to storage, see
  // video-picker-input.tsx) by the time this fires.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (videoUploading) {
      e.preventDefault();
      setClientError(t("Video wird noch hochgeladen — kurz warten.", "The video is still uploading — please wait a moment."));
      return;
    }
    if (!videoUploaded) {
      e.preventDefault();
      setClientError(t("Bitte zuerst ein Video auswählen.", "Please choose a video first."));
      return;
    }
    setClientError(null);
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 p-3">
      <input type="hidden" name="soloPitchId" value={soloPitchId} />
      {parentReactionId && <input type="hidden" name="parentReactionId" value={parentReactionId} />}
      <FormError message={clientError ?? state?.error} />
      <VideoPickerInput
        folder="reaction-videos"
        onUploadStateChange={({ uploading, uploadedUrl }) => {
          setVideoUploading(uploading);
          setVideoUploaded(Boolean(uploadedUrl));
        }}
      />
      <AudioRightsCheckbox />
      <AiContentCheckbox />
      <SubmitButton>{parentReactionId ? t("Antwort posten", "Post reply") : t("Reaktion posten", "Post reaction")}</SubmitButton>
    </form>
  );
}
