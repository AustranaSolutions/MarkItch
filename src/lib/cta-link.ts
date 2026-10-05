const MAX_LABEL_LENGTH = 40;

/**
 * Phase C (Audit M3): Wer „shop.at“ tippt, meint https://shop.at. Ergänzt nur,
 * wenn noch kein Schema davorsteht — ein kopierter Link mit https:// bleibt
 * unverändert, es wird also nie doppelt.
 */
export function withHttps(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export type CtaLinkResult = { ctaLabel: string; ctaUrl: string } | { errors: Record<string, string[]> };

/**
 * Phase 27: shared by every fresh-video server action (Solo-Pitch, Duell-
 * Video, Kontern) — required for any new upload, plain manual validation to
 * match the surrounding action files' existing style (no zod there).
 */
export function validateCtaLink(formData: FormData): CtaLinkResult {
  const errors: Record<string, string[]> = {};

  const rawLabel = formData.get("ctaLabel");
  const ctaLabel = typeof rawLabel === "string" ? rawLabel.trim() : "";
  if (!ctaLabel) {
    errors.ctaLabel = ["Bitte eine Beschriftung angeben."];
  } else if (ctaLabel.length > MAX_LABEL_LENGTH) {
    errors.ctaLabel = [`Maximal ${MAX_LABEL_LENGTH} Zeichen.`];
  }

  const rawUrl = formData.get("ctaUrl");
  const ctaUrlInput = typeof rawUrl === "string" ? withHttps(rawUrl) : "";
  let ctaUrl = "";
  if (!ctaUrlInput) {
    errors.ctaUrl = ["Bitte einen Link angeben."];
  } else {
    try {
      const parsed = new URL(ctaUrlInput);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");
      ctaUrl = parsed.toString();
    } catch {
      errors.ctaUrl = ["Ungültiger Link (z. B. https://example.com)."];
    }
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { ctaLabel, ctaUrl };
}
