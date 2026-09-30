"use client";

import { useActionState, useState, type FormEvent } from "react";
import { postSoloPitch, type SoloPitchFormState } from "@/app/actions/solo-pitch";
import { submitChallengeEntry } from "@/app/actions/creator-challenge";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";
import { AudioRightsCheckbox } from "@/components/pitches/audio-rights-checkbox";
import { AiContentCheckbox } from "@/components/pitches/ai-content-checkbox";

/** RN-7: mit `challengeId` wird der Post als Einreichung zu dieser Creator-Challenge gespeichert. */
export function SoloPitchUploadForm({ challengeId }: { challengeId?: string } = {}) {
  const [state, action] = useActionState<SoloPitchFormState, FormData>(
    challengeId ? submitChallengeEntry : postSoloPitch,
    undefined,
  );
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);

  // Phase 29: the video is already uploaded (directly to storage, see
  // video-picker-input.tsx) by the time this fires — this only blocks
  // submitting while that upload is still in flight or never happened.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (videoUploading) {
      e.preventDefault();
      setClientError("Video wird noch hochgeladen — kurz warten.");
      return;
    }
    if (!videoUploaded) {
      e.preventDefault();
      setClientError("Bitte zuerst ein Video auswählen.");
      return;
    }
    setClientError(null);
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      {challengeId && <input type="hidden" name="challengeId" value={challengeId} />}
      <FormError
        message={
          clientError ?? state?.errors?._form?.[0] ?? state?.errors?.video?.[0] ?? state?.errors?.description?.[0]
        }
      />
      <VideoPickerInput
        folder="solo-pitch-videos"
        onUploadStateChange={({ uploading, uploadedUrl }) => {
          setVideoUploading(uploading);
          setVideoUploaded(Boolean(uploadedUrl));
        }}
      />
      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-300">
          Beschreibung
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={300}
          rows={3}
          placeholder="Worum geht's in diesem Video?"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-orange-500"
        />
      </div>
      <CtaLinkFields
        errors={state?.errors}
        ctaLabel={ctaLabel}
        ctaUrl={ctaUrl}
        onCtaLabelChange={setCtaLabel}
        onCtaUrlChange={setCtaUrl}
      />
      <AudioRightsCheckbox errors={state?.errors} />
      <AiContentCheckbox />
      <SubmitButton>{challengeId ? "Video einreichen" : "Solo-Pitch posten"}</SubmitButton>
    </form>
  );
}
