import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands } from "@/db/schema";
import { notifyUsers } from "@/lib/notification";

// Luca 15.11.: Profile in der Beschreibung markieren — „@genussfux“. Gespeichert
// wird nur der Text; die Profil-Adresse (slug) ändert sich nie, deshalb bleibt
// die Markierung auch nach einer Namensänderung gültig. Beim Anzeigen werden nur
// Markierungen verlinkt, zu denen es das Profil wirklich gibt.

export type Mention = { slug: string; name: string };

const MENTION_RE = /(^|[^\p{L}\p{N}_@.-])@([a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?)(?![a-z0-9-])/giu;

/** Alle markierten Profil-Adressen (klein geschrieben, ohne Doppelte). */
export function extractMentionSlugs(text: string | null | undefined): string[] {
  if (!text) return [];
  const slugs = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) slugs.add(m[2].toLowerCase());
  return [...slugs].slice(0, 20);
}

/** Löst die Markierungen mehrerer Texte auf einmal auf (eine Abfrage). */
export async function resolveMentions(texts: (string | null | undefined)[]): Promise<Map<string, Mention>> {
  const all = [...new Set(texts.flatMap((t) => extractMentionSlugs(t)))];
  if (all.length === 0) return new Map();
  const rows = await db.select({ slug: brands.slug, name: brands.name }).from(brands).where(inArray(brands.slug, all));
  return new Map(rows.map((r) => [r.slug, r]));
}

/** Markierungen eines Textes, die es als Profil gibt — in der Reihenfolge des Textes. */
export function mentionsOf(text: string | null | undefined, resolved: Map<string, Mention>): Mention[] {
  return extractMentionSlugs(text).flatMap((slug) => {
    const m = resolved.get(slug);
    return m ? [m] : [];
  });
}

/**
 * Benachrichtigt neu markierte Profile (nicht das eigene, nicht schon vorher
 * markierte — beim Bearbeiten nur die neu dazugekommenen).
 */
export async function notifyNewMentions(input: {
  authorBrandId: string;
  text: string | null | undefined;
  previousText?: string | null;
  link: string;
}): Promise<void> {
  const before = new Set(extractMentionSlugs(input.previousText));
  const fresh = extractMentionSlugs(input.text).filter((s) => !before.has(s));
  if (fresh.length === 0) return;
  const [author] = await db.select({ name: brands.name }).from(brands).where(eq(brands.id, input.authorBrandId)).limit(1);
  if (!author) return;
  const targets = await db
    .select({ brandId: brands.id, userId: brandMembers.userId })
    .from(brands)
    .innerJoin(brandMembers, eq(brandMembers.brandId, brands.id))
    .where(inArray(brands.slug, fresh));
  const userIds = targets.filter((t) => t.brandId !== input.authorBrandId).map((t) => t.userId);
  if (userIds.length === 0) return;
  await notifyUsers(
    userIds,
    { de: `🏷️ ${author.name} hat dich in einem Video erwähnt.`, en: `🏷️ ${author.name} mentioned you in a video.` },
    input.link,
    undefined,
    "mention",
  );
}
