import "server-only";
import { getBrandForUser } from "@/lib/brand";
import { createCasting, getActiveCastingForBrand, submitToCasting } from "@/lib/casting";
import { readVideoUrlField } from "@/lib/storage";
import { validateCtaLink } from "@/lib/cta-link";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { AudioRightsSchema } from "@/lib/validation";

// RN-5d: Partner-Casting starten / einreichen — gemeinsam genutzt von den
// Web-Actions (actions/casting.ts) und den App-Routen (/api/mobile/castings*).

export type CastingResult = { ok: true; castingId: string } | { ok: false; error: string };

const MAX_PROMPT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 300;

/**
 * Phase 19: a brand opens a "Partner-Casting" — a call for other brands
 * (creators/influencers running their own brand profile) to submit a pitch
 * video. Deliberately no video from the host here — starting a casting is
 * just the call, not an entry (see CLAUDE-CODE-UEBERGABE.md's Ideen-Backlog
 * for the concept). One active casting per brand at a time, to keep a
 * brand's profile page simple rather than juggling several running calls.
 */
export async function startCastingFor(user: { id: string }, rawPrompt: unknown): Promise<CastingResult> {
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du musst zuerst eine Marke erstellen." };
  }

  const existing = await getActiveCastingForBrand(myBrand.id);
  if (existing) {
    return { ok: false, error: "Du hast bereits ein laufendes Casting." };
  }

  const prompt = typeof rawPrompt === "string" ? rawPrompt.trim() : "";
  if (!prompt) {
    return { ok: false, error: "Bitte beschreibe kurz, wen du suchst." };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: `Maximal ${MAX_PROMPT_LENGTH} Zeichen.` };
  }

  const { allowed } = await checkRateLimit("casting-start", myBrand.id);
  if (!allowed) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const casting = await createCasting(myBrand.id, prompt);
  return { ok: true, castingId: casting.id };
}

/** Erwartet dieselben Feldnamen wie das Web-Formular (castingId, videoUrl, description, ctaLabel, ctaUrl, …). */
export async function submitCastingEntryFor(user: { id: string }, formData: FormData): Promise<CastingResult> {
  const castingId = formData.get("castingId");
  if (typeof castingId !== "string" || !castingId) {
    return { ok: false, error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du musst zuerst eine Marke erstellen, um mitzumachen." };
  }

  const video = readVideoUrlField(formData, "casting-videos");
  if ("error" in video) {
    return { ok: false, error: video.error };
  }

  // Phase 41: same required fields as a Solo-Pitch/Creator-Video — Luca:
  // "sollte 1:1 aussehen wie ein Solo-Pitch."
  const rawDescription = formData.get("description");
  const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
  if (!description) {
    return { ok: false, error: "Bitte eine kurze Beschreibung schreiben." };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, error: `Maximal ${MAX_DESCRIPTION_LENGTH} Zeichen.` };
  }

  const cta = validateCtaLink(formData);
  if ("errors" in cta) {
    return { ok: false, error: Object.values(cta.errors)[0]![0] };
  }

  const audioRights = AudioRightsSchema.safeParse({ audioRightsConfirmed: formData.get("audioRightsConfirmed") });
  if (!audioRights.success) {
    return { ok: false, error: Object.values(audioRights.error.flatten().fieldErrors)[0]![0] };
  }

  const { allowed } = await checkRateLimit("casting-submit", myBrand.id);
  if (!allowed) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const containsAiContent = formData.get("containsAiContent") === "on";
  const result = await submitToCasting(castingId, myBrand.id, video.videoUrl, description, cta.ctaLabel, cta.ctaUrl, containsAiContent);
  if (result.error) return { ok: false, error: result.error };
  return { ok: true, castingId };
}
