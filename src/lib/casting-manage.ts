import "server-only";
import { getBrandForUser } from "@/lib/brand";
import { CASTING_SUBMISSION_DAYS, checkCastingSubmission, createCasting, getActiveCastingForBrand } from "@/lib/casting";
import { createSoloPitchForUser, deleteOwnSoloPitch } from "@/lib/solo-pitch";
import { db } from "@/db";
import { castingSubmissions } from "@/db/schema";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

// RN-5d: Partner-Casting starten / einreichen — gemeinsam genutzt von den
// Web-Actions (actions/casting.ts) und den App-Routen (/api/mobile/castings*).

export type CastingResult = { ok: true; castingId: string } | { ok: false; error: string };

const MAX_PROMPT_LENGTH = 200;

/**
 * Phase 19: a brand opens a "Partner-Casting" — a call for other brands
 * (creators/influencers running their own brand profile) to submit a pitch
 * video. Deliberately no video from the host here — starting a casting is
 * just the call, not an entry (see CLAUDE-CODE-UEBERGABE.md's Ideen-Backlog
 * for the concept). One active casting per brand at a time, to keep a
 * brand's profile page simple rather than juggling several running calls.
 */
export async function startCastingFor(user: { id: string }, rawPrompt: unknown, rawDays?: unknown): Promise<CastingResult> {
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

  // RN-7: Frist wählbar (7/14/30 Tage), ohne Angabe wie bisher 14.
  const days = rawDays === undefined || rawDays === null || rawDays === "" ? 14 : Number(rawDays);
  if (!CASTING_SUBMISSION_DAYS.includes(days as (typeof CASTING_SUBMISSION_DAYS)[number])) {
    return { ok: false, error: "Bitte eine Einreichfrist wählen." };
  }

  const casting = await createCasting(myBrand.id, prompt, days);
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

  // Erst prüfen, ob die Marke überhaupt (noch) mitmachen darf — bevor ein Post entsteht.
  const eligible = await checkCastingSubmission(castingId, myBrand.id);
  if (eligible.error) return { ok: false, error: eligible.error };

  const { allowed } = await checkRateLimit("casting-submit", myBrand.id);
  if (!allowed) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  // RN-7 (Luca 30.09.): die Einreichung ist zugleich ein normaler Solo-Pitch
  // im Feed (mit Knopf „Zum Casting“) — dieselben Pflichtfelder wie jeder
  // Post, Video im Ordner solo-pitch-videos.
  const pitch = await createSoloPitchForUser(user.id, formData);
  if (!pitch.ok) return { ok: false, error: Object.values(pitch.errors)[0]?.[0] ?? "Ungültige Eingabe." };

  try {
    await db.insert(castingSubmissions).values({
      castingId,
      brandId: myBrand.id,
      videoUrl: pitch.videoUrl,
      description: pitch.description,
      ctaLabel: pitch.ctaLabel,
      ctaUrl: pitch.ctaUrl,
      containsAiContent: pitch.containsAiContent,
      soloPitchId: pitch.id,
    });
  } catch {
    // z. B. doppelt abgeschickt (eindeutiger Index) → Post wieder weg.
    await deleteOwnSoloPitch(user.id, pitch.id);
    return { ok: false, error: "Du hast für dieses Casting bereits eingereicht." };
  }
  return { ok: true, castingId };
}
