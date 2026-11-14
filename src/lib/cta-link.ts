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

const MAX_CODE_LENGTH = 30;

/**
 * Luca 13.11. (Phase 3): optionaler Rabattcode zum Link (z. B. HALLO10).
 * Leer → null. Groß/klein bleibt wie getippt (manche Shops unterscheiden).
 */
export function parseCtaCode(raw: unknown): { code: string | null } | { error: string } {
  const code = typeof raw === "string" ? raw.trim() : "";
  if (!code) return { code: null };
  if (code.length > MAX_CODE_LENGTH) return { error: `Code: maximal ${MAX_CODE_LENGTH} Zeichen.` };
  if (!/^[\p{L}\p{N}_.%-]+$/u.test(code)) return { error: "Code: nur Buchstaben, Ziffern und - _ . % (keine Leerzeichen)." };
  return { code };
}

export type CtaLinkResult =
  | { ctaLabel: string; ctaUrl: string; ctaCode: string | null }
  // Luca 13.11. (Phase 4): nur bei optionalem Link (Creator) — alles leer.
  | { ctaLabel: null; ctaUrl: null; ctaCode: null }
  | { errors: Record<string, string[]> };

/**
 * Phase 27: shared by every fresh-video server action (Solo-Pitch, Duell-
 * Video, Kontern) — required for any new upload, plain manual validation to
 * match the surrounding action files' existing style (no zod there).
 */
export function validateCtaLink(formData: FormData, options: { optional?: boolean } = {}): CtaLinkResult {
  const errors: Record<string, string[]> = {};

  // Luca 13.11. (Phase 4): Creator-Videos brauchen keinen Link — alles leer ist dann ok.
  const filled = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" && v.trim() !== "";
  };
  if (options.optional && !filled("ctaLabel") && !filled("ctaUrl")) {
    if (filled("ctaCode")) return { errors: { ctaUrl: ["Ein Code braucht einen Link."] } };
    return { ctaLabel: null, ctaUrl: null, ctaCode: null };
  }

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

  const code = parseCtaCode(formData.get("ctaCode"));
  if ("error" in code) errors.ctaCode = [code.error];

  if (Object.keys(errors).length > 0 || "error" in code) return { errors };
  return { ctaLabel, ctaUrl, ctaCode: code.code };
}
