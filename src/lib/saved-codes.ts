import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { battles, brands, savedCodes, soloPitches } from "@/db/schema";
import { getThumbnailMap } from "@/lib/video-thumbnails";

// Luca 13.11. (Phase 3): „Meine Codes“ — wer auf den Link-Knopf eines Videos
// mit Rabattcode tippt, bekommt den Code hier gespeichert (mit Link und Video).
// Der Server liest Code/Link/Video selbst aus dem Video — vom Gerät kommt nur,
// welches Video es war.

const MAX_SAVED = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SavedCodeTarget = "pitch" | "battle";

export type SavedCodeView = {
  id: string;
  code: string;
  ctaUrl: string;
  ctaLabel: string | null;
  videoUrl: string;
  /** Eigenes Titelbild des Videos, sonst null (dann erstes Bild des Videos). */
  thumbnailUrl: string | null;
  /** Pfad zum Video im Feed (Web und App verstehen ihn). */
  href: string;
  targetType: SavedCodeTarget;
  targetId: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  savedAt: string;
};

type CodeSource = { brandId: string; code: string; ctaUrl: string; ctaLabel: string | null; videoUrl: string };

async function findCodeSource(targetType: SavedCodeTarget, targetId: string, brandId: string): Promise<CodeSource | null> {
  if (targetType === "pitch") {
    const [p] = await db.select().from(soloPitches).where(eq(soloPitches.id, targetId)).limit(1);
    if (!p || !p.ctaCode || !p.ctaUrl) return null;
    return { brandId: p.brandId, code: p.ctaCode, ctaUrl: p.ctaUrl, ctaLabel: p.ctaLabel, videoUrl: p.videoUrl };
  }
  const [b] = await db.select().from(battles).where(eq(battles.id, targetId)).limit(1);
  if (!b) return null;
  if (b.brandAId === brandId && b.brandACtaCode && b.brandACtaUrl && b.brandAVideoUrl) {
    return { brandId, code: b.brandACtaCode, ctaUrl: b.brandACtaUrl, ctaLabel: b.brandACtaLabel, videoUrl: b.brandAVideoUrl };
  }
  if (b.brandBId === brandId && b.brandBCtaCode && b.brandBCtaUrl && b.brandBVideoUrl) {
    return { brandId, code: b.brandBCtaCode, ctaUrl: b.brandBCtaUrl, ctaLabel: b.brandBCtaLabel, videoUrl: b.brandBVideoUrl };
  }
  return null;
}

/** Speichert (oder frischt auf) den Code eines Videos. Stilles Nein, wenn das Video keinen Code hat. */
export async function saveCode(userId: string, input: { targetType?: unknown; targetId?: unknown; brandId?: unknown }): Promise<{ ok: boolean }> {
  const targetType = input.targetType === "pitch" || input.targetType === "battle" ? input.targetType : null;
  const targetId = typeof input.targetId === "string" && UUID_RE.test(input.targetId) ? input.targetId : null;
  const brandId = typeof input.brandId === "string" && UUID_RE.test(input.brandId) ? input.brandId : null;
  if (!targetType || !targetId || !brandId) return { ok: false };

  const source = await findCodeSource(targetType, targetId, brandId);
  if (!source) return { ok: false };

  const values = { ...source, createdAt: new Date() };
  await db
    .insert(savedCodes)
    .values({ userId, targetType, targetId, ...values })
    .onConflictDoUpdate({
      target: [savedCodes.userId, savedCodes.targetType, savedCodes.targetId, savedCodes.brandId],
      set: values,
    });
  return { ok: true };
}

export async function listSavedCodes(userId: string): Promise<SavedCodeView[]> {
  const rows = await db
    .select({ c: savedCodes, brand: { name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl } })
    .from(savedCodes)
    .innerJoin(brands, eq(brands.id, savedCodes.brandId))
    .where(eq(savedCodes.userId, userId))
    .orderBy(desc(savedCodes.createdAt))
    .limit(MAX_SAVED);
  const thumbnails = await getThumbnailMap(rows.map((r) => r.c.videoUrl));
  return rows.map(({ c, brand }) => ({
    id: c.id,
    code: c.code,
    ctaUrl: c.ctaUrl,
    ctaLabel: c.ctaLabel,
    videoUrl: c.videoUrl,
    thumbnailUrl: thumbnails.get(c.videoUrl) ?? null,
    href: c.targetType === "battle" ? `/?battle=${c.targetId}&lead=${c.brandId}` : `/?pitch=${c.targetId}`,
    targetType: c.targetType === "battle" ? "battle" : "pitch",
    targetId: c.targetId,
    brandId: c.brandId,
    brandName: brand.name,
    brandSlug: brand.slug,
    brandLogoUrl: brand.logoUrl,
    savedAt: c.createdAt.toISOString(),
  }));
}

export async function deleteSavedCode(userId: string, id: unknown): Promise<void> {
  if (typeof id !== "string" || !UUID_RE.test(id)) return;
  await db.delete(savedCodes).where(and(eq(savedCodes.id, id), eq(savedCodes.userId, userId)));
}
