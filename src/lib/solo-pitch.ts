import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { soloPitches, brands, type SoloPitch } from "@/db/schema";
import { getBrandForUser } from "@/lib/brand";
import { validateCtaLink } from "@/lib/cta-link";
import { readVideoUrlField } from "@/lib/storage";
import { DEFAULT_DUEL_CATEGORY } from "@/lib/battle-format";
import { AudioRightsSchema } from "@/lib/validation";

export type SoloPitchBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export type SoloPitchWithBrand = SoloPitch & { brand: SoloPitchBrand };

const brandCols = { id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl };

export async function getAllSoloPitches(): Promise<SoloPitchWithBrand[]> {
  const rows = await db
    .select({ pitch: soloPitches, brand: brandCols })
    .from(soloPitches)
    .innerJoin(brands, eq(soloPitches.brandId, brands.id))
    .orderBy(desc(soloPitches.createdAt));
  return rows.map((r) => ({ ...r.pitch, brand: r.brand }));
}

export async function getSoloPitchById(id: string): Promise<SoloPitchWithBrand | null> {
  const [row] = await db
    .select({ pitch: soloPitches, brand: brandCols })
    .from(soloPitches)
    .innerJoin(brands, eq(soloPitches.brandId, brands.id))
    .where(eq(soloPitches.id, id))
    .limit(1);
  return row ? { ...row.pitch, brand: row.brand } : null;
}

export async function getSoloPitchesForBrand(brandId: string): Promise<SoloPitch[]> {
  return db.select().from(soloPitches).where(eq(soloPitches.brandId, brandId)).orderBy(desc(soloPitches.createdAt));
}

// RN-3: Bearbeiten/Löschen eigener Solo-Pitches — gemeinsam genutzt von den
// Web-Actions (actions/solo-pitch.ts) und der App-Route (/api/solo-pitches/[id]).

export const MAX_SOLO_PITCH_DESCRIPTION_LENGTH = 300;

export function validateDescription(raw: unknown): { description: string } | { error: string } {
  const description = typeof raw === "string" ? raw.trim() : "";
  if (!description) return { error: "Bitte eine kurze Beschreibung schreiben." };
  if (description.length > MAX_SOLO_PITCH_DESCRIPTION_LENGTH) {
    return { error: `Maximal ${MAX_SOLO_PITCH_DESCRIPTION_LENGTH} Zeichen.` };
  }
  return { description };
}

type OwnershipResult = { ok: true } | { ok: false; error: string };

async function checkOwnSoloPitch(userId: string, soloPitchId: string): Promise<OwnershipResult> {
  const myBrand = await getBrandForUser(userId);
  if (!myBrand) return { ok: false, error: "Du hast keine Marke." };
  const [pitch] = await db.select({ brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch || pitch.brandId !== myBrand.id) return { ok: false, error: "Das ist nicht dein Pitch." };
  return { ok: true };
}

/**
 * Nur Beschreibung + CTA + KI-Kennzeichnung, nie das Video selbst (neues
 * Video = neuer Post). KI-Kennzeichnung nachträglich änderbar (Luca
 * 30.09.: falls beim Posten vergessen); fehlt der Wert, bleibt er unverändert.
 */
export async function updateOwnSoloPitch(
  userId: string,
  soloPitchId: string,
  input: { description: unknown; ctaLabel: unknown; ctaUrl: unknown; containsAiContent?: boolean },
): Promise<
  | { ok: true; description: string; ctaLabel: string; ctaUrl: string; containsAiContent?: boolean }
  | { ok: false; errors: Record<string, string[]> }
> {
  const owner = await checkOwnSoloPitch(userId, soloPitchId);
  if (!owner.ok) return { ok: false, errors: { _form: [owner.error] } };

  const description = validateDescription(input.description);
  if ("error" in description) return { ok: false, errors: { description: [description.error] } };

  const ctaForm = new FormData();
  ctaForm.set("ctaLabel", typeof input.ctaLabel === "string" ? input.ctaLabel : "");
  ctaForm.set("ctaUrl", typeof input.ctaUrl === "string" ? input.ctaUrl : "");
  const cta = validateCtaLink(ctaForm);
  if ("errors" in cta) return { ok: false, errors: cta.errors };

  await db
    .update(soloPitches)
    .set({
      description: description.description,
      ctaLabel: cta.ctaLabel,
      ctaUrl: cta.ctaUrl,
      ...(input.containsAiContent === undefined ? {} : { containsAiContent: input.containsAiContent }),
    })
    .where(eq(soloPitches.id, soloPitchId));
  return {
    ok: true,
    description: description.description,
    ctaLabel: cta.ctaLabel,
    ctaUrl: cta.ctaUrl,
    ...(input.containsAiContent === undefined ? {} : { containsAiContent: input.containsAiContent }),
  };
}

export async function deleteOwnSoloPitch(userId: string, soloPitchId: string): Promise<OwnershipResult> {
  const owner = await checkOwnSoloPitch(userId, soloPitchId);
  if (!owner.ok) return owner;
  await db.delete(soloPitches).where(eq(soloPitches.id, soloPitchId));
  return { ok: true };
}

/**
 * RN-4c: Neuen Solo-Pitch anlegen — gemeinsam genutzt von der Web-Action
 * postSoloPitch und der App-Route /api/mobile/solo-pitches. Das Video liegt
 * zu diesem Zeitpunkt schon im Speicher (Direkt-Upload), hier kommt nur die
 * URL an. Erwartet dieselben Feldnamen wie das Web-Formular.
 */
export async function createSoloPitchForUser(
  userId: string,
  formData: FormData,
  // RN-7: Einreichung zu einer Creator-Challenge (Prüfung macht der Aufrufer).
  options: { creatorChallengeId?: string } = {},
): Promise<{ ok: true; id: string; videoUrl: string; description: string; ctaLabel: string; ctaUrl: string; containsAiContent: boolean } | { ok: false; errors: Record<string, string[]> }> {
  const myBrand = await getBrandForUser(userId);
  if (!myBrand) return { ok: false, errors: { _form: ["Du musst zuerst eine Marke erstellen."] } };

  const video = readVideoUrlField(formData, "solo-pitch-videos");
  if ("error" in video) return { ok: false, errors: { video: [video.error] } };

  const description = validateDescription(formData.get("description"));
  if ("error" in description) return { ok: false, errors: { description: [description.error] } };

  const cta = validateCtaLink(formData);
  if ("errors" in cta) return { ok: false, errors: cta.errors };

  const audioRights = AudioRightsSchema.safeParse({ audioRightsConfirmed: formData.get("audioRightsConfirmed") });
  if (!audioRights.success) return { ok: false, errors: audioRights.error.flatten().fieldErrors };

  const containsAiContent = formData.get("containsAiContent") === "on";
  const [pitch] = await db
    .insert(soloPitches)
    .values({
      brandId: myBrand.id,
      videoUrl: video.videoUrl,
      category: DEFAULT_DUEL_CATEGORY,
      description: description.description,
      ctaLabel: cta.ctaLabel,
      ctaUrl: cta.ctaUrl,
      containsAiContent,
      creatorChallengeId: options.creatorChallengeId ?? null,
    })
    .returning({ id: soloPitches.id });
  return {
    ok: true,
    id: pitch.id,
    videoUrl: video.videoUrl,
    description: description.description,
    ctaLabel: cta.ctaLabel,
    ctaUrl: cta.ctaUrl,
    containsAiContent,
  };
}
