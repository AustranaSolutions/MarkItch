import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { soloPitches, brands, type SoloPitch } from "@/db/schema";
import { getBrandForUser } from "@/lib/brand";
import { validateCtaLink } from "@/lib/cta-link";

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

/** Nur Beschreibung + CTA, nie das Video selbst (neues Video = neuer Post). */
export async function updateOwnSoloPitch(
  userId: string,
  soloPitchId: string,
  input: { description: unknown; ctaLabel: unknown; ctaUrl: unknown },
): Promise<{ ok: true; description: string; ctaLabel: string; ctaUrl: string } | { ok: false; errors: Record<string, string[]> }> {
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
    .set({ description: description.description, ctaLabel: cta.ctaLabel, ctaUrl: cta.ctaUrl })
    .where(eq(soloPitches.id, soloPitchId));
  return { ok: true, description: description.description, ctaLabel: cta.ctaLabel, ctaUrl: cta.ctaUrl };
}

export async function deleteOwnSoloPitch(userId: string, soloPitchId: string): Promise<OwnershipResult> {
  const owner = await checkOwnSoloPitch(userId, soloPitchId);
  if (!owner.ok) return owner;
  await db.delete(soloPitches).where(eq(soloPitches.id, soloPitchId));
  return { ok: true };
}
