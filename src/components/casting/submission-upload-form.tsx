"use client";

import { useActionState, useState, type FormEvent } from "react";
import { submitCastingEntry, type SubmitCastingFormState } from "@/app/actions/casting";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";
import { AudioRightsCheckbox } from "@/components/pitches/audio-rights-checkbox";
import { AiContentCheckbox } from "@/components/pitches/ai-content-checkbox";

export function SubmissionUploadForm({ castingId }: { castingId: string }) {
  const [state, action] = useActionState<SubmitCastingFormState, FormData>(submitCastingEntry, undefined);
  const [clientError, setClientError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  // Phase 29: the video is already uploaded (directly to storage, see
  // video-picker-input.tsx) by the time this fires.
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
      <input type="hidden" name="castingId" value={castingId} />
      <FormError message={clientError ?? state?.error} />
      <VideoPickerInput
        folder="solo-pitch-videos"
        onUploadStateChange={({ uploading, uploadedUrl }) => {
          setVideoUploading(uploading);
          setVideoUploaded(Boolean(uploadedUrl));
        }}
      />
      <label htmlFor="casting-description" className="mb-1 block text-sm font-medium text-zinc-300">
        Beschreibung
      </label>
      <textarea
        id="casting-description"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        maxLength={300}
        placeholder="Worum geht's in diesem Video?"
        className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
      />
      <CtaLinkFields ctaLabel={ctaLabel} ctaUrl={ctaUrl} onCtaLabelChange={setCtaLabel} onCtaUrlChange={setCtaUrl} />
      <AudioRightsCheckbox />
      <AiContentCheckbox />
      <SubmitButton>Video einreichen</SubmitButton>
    </form>
  );
}
