"use client";

import { useActionState, useState, type FormEvent } from "react";
import { submitCastingEntry, type SubmitCastingFormState } from "@/app/actions/casting";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";
import { AudioRightsCheckbox } from "@/components/pitches/audio-rights-checkbox";
import { AiContentCheckbox } from "@/components/pitches/ai-content-checkbox";
import { useT } from "@/components/i18n/lang-provider";

export function SubmissionUploadForm({ castingId }: { castingId: string }) {
  const t = useT();
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
        {t("Beschreibung", "Description")}
      </label>
      <textarea
        id="casting-description"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        maxLength={300}
        placeholder={t("Worum geht's in diesem Video?", "What’s this video about?")}
        className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
      />
      <CtaLinkFields ctaLabel={ctaLabel} ctaUrl={ctaUrl} onCtaLabelChange={setCtaLabel} onCtaUrlChange={setCtaUrl} />
      <AudioRightsCheckbox />
      <AiContentCheckbox />
      <SubmitButton>{t("Video einreichen", "Submit video")}</SubmitButton>
    </form>
  );
}
