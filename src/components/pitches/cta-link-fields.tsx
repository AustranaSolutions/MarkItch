"use client";

import { Field } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

// Phase 27: shared by every fresh video upload (Solo-Pitch, Duell-Video,
// Kontern) — a video without a "wohin jetzt" ist für den Zuschauer eine
// Sackgasse. Required going forward, but the DB columns stay nullable so
// existing content never needs a backfill (see schema.ts).
//
// Phase 27.1: controlled-mode props (same pattern as Field itself, see
// ui.tsx) — a caller passes ctaLabel/ctaUrl + their setters so a server-
// side error (e.g. an invalid URL) doesn't wipe out what was already
// typed, same fix as Phase 23's Register/Login/CreateBrand forms.
export function CtaLinkFields({
  errors,
  ctaLabel,
  ctaUrl,
  onCtaLabelChange,
  onCtaUrlChange,
}: {
  errors?: Record<string, string[]>;
  ctaLabel?: string;
  ctaUrl?: string;
  onCtaLabelChange?: (value: string) => void;
  onCtaUrlChange?: (value: string) => void;
}) {
  const t = useT();
  return (
    <div className="mb-3 rounded-lg border border-zinc-800 p-3">
      <p className="mb-2 text-xs text-zinc-500">
        {t(
          "Wohin soll ein interessierter Zuschauer geleitet werden? Shop, Speisekarte, Standort/Route, Rabattcode-Landingpage — was auch immer zu diesem Video passt.",
          "Where should an interested viewer go? Shop, menu, location/directions, discount landing page — whatever fits this video.",
        )}
      </p>
      <Field
        label={t("Beschriftung (z. B. „Jetzt bestellen“, „Route“)", "Button text (e.g. “Order now”, “Directions”)")}
        name="ctaLabel"
        errors={errors?.ctaLabel}
        value={ctaLabel}
        onChange={onCtaLabelChange}
      />
      <Field label="Link" name="ctaUrl" type="url" errors={errors?.ctaUrl} value={ctaUrl} onChange={onCtaUrlChange} />
    </div>
  );
}
