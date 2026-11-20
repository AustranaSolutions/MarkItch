import "server-only";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { brands, castingSubmissions, partnerCastings } from "@/db/schema";
import { getBrandMemberUserIds } from "@/lib/brand";
import { adminUserIds } from "@/lib/brand-trust";
import { notifyUsers } from "@/lib/notification";

/**
 * Luca 20.11. (Phasen-Map 7.5): Partner-Abzeichen nach einem Casting.
 * Die Marke bestätigt selbst, wen sie als offiziellen Partner nimmt (der
 * Community-Favorit ist nur ein Vorschlag). Entfernen geht nicht per Klick,
 * sondern über einen Antrag an MarkItch — ein Admin entscheidet.
 *
 * Eingeschaltet erst mit `PARTNER_BADGE_ENABLED=1` in Vercel (vorher regeln
 * AGB/Nutzungsbedingungen das, Anwalt). Ausgeschaltet liefern alle
 * Schnittstellen nichts Neues — App und Web zeigen dann nichts an.
 */
export function partnerBadgeEnabled(): boolean {
  return process.env.PARTNER_BADGE_ENABLED === "1";
}

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

export type CastingPartner = {
  submissionId: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  confirmedAt: string;
  removalRequested: boolean;
};

/** Bestätigter Partner eines Castings (oder null). */
export async function getCastingPartner(castingId: string): Promise<CastingPartner | null> {
  if (!partnerBadgeEnabled()) return null;
  const [row] = await db
    .select({
      submissionId: castingSubmissions.id,
      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
      confirmedAt: partnerCastings.partnerConfirmedAt,
      removalRequestedAt: partnerCastings.partnerRemovalRequestedAt,
    })
    .from(partnerCastings)
    .innerJoin(castingSubmissions, eq(castingSubmissions.id, partnerCastings.partnerSubmissionId))
    .innerJoin(brands, eq(brands.id, castingSubmissions.brandId))
    .where(and(eq(partnerCastings.id, castingId), isNotNull(partnerCastings.partnerConfirmedAt)))
    .limit(1);
  if (!row?.confirmedAt) return null;
  return {
    submissionId: row.submissionId,
    brandId: row.brandId,
    brandName: row.brandName,
    brandSlug: row.brandSlug,
    confirmedAt: row.confirmedAt.toISOString(),
    removalRequested: row.removalRequestedAt !== null,
  };
}

export type PartnerBadge = { castingId: string; hostBrand: { id: string; name: string; slug: string; logoUrl: string | null } };

/** „Offizieller Partner von …“ — alle bestätigten Partnerschaften einer Marke, neueste zuerst. */
export async function getPartnerBadgesForBrand(brandId: string): Promise<PartnerBadge[]> {
  if (!partnerBadgeEnabled()) return [];
  const rows = await db
    .select({ castingId: partnerCastings.id, hostBrandId: partnerCastings.hostBrandId })
    .from(partnerCastings)
    .innerJoin(castingSubmissions, eq(castingSubmissions.id, partnerCastings.partnerSubmissionId))
    .where(and(eq(castingSubmissions.brandId, brandId), isNotNull(partnerCastings.partnerConfirmedAt)))
    .orderBy(desc(partnerCastings.partnerConfirmedAt));
  if (rows.length === 0) return [];
  const hosts = await db
    .select({ id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl })
    .from(brands)
    .where(inArray(brands.id, [...new Set(rows.map((r) => r.hostBrandId))]));
  const hostById = new Map(hosts.map((h) => [h.id, h]));
  // Eine Marke mehrmals als Partner derselben Marke → nur einmal zeigen.
  const seen = new Set<string>();
  const out: PartnerBadge[] = [];
  for (const r of rows) {
    const host = hostById.get(r.hostBrandId);
    if (!host || seen.has(host.id)) continue;
    seen.add(host.id);
    out.push({ castingId: r.castingId, hostBrand: host });
  }
  return out;
}

async function loadCasting(castingId: string) {
  const [casting] = await db.select().from(partnerCastings).where(eq(partnerCastings.id, castingId)).limit(1);
  return casting ?? null;
}

/** Die Marke des Castings bestätigt eine Einreichung als offiziellen Partner (einmalig). */
export async function confirmCastingPartner(hostBrandId: string, castingId: string, submissionId: unknown): Promise<Result> {
  if (!partnerBadgeEnabled()) return fail("Das gibt es noch nicht.");
  if (typeof submissionId !== "string") return fail("Ungültige Anfrage.");
  const casting = await loadCasting(castingId);
  if (!casting || casting.hostBrandId !== hostBrandId) return fail("Nur die Marke des Castings kann ihren Partner bestätigen.");
  if (casting.votingEndsAt.getTime() > Date.now()) return fail("Erst nach dem Ende der Abstimmung.");
  if (casting.partnerConfirmedAt) return fail("Du hast schon einen Partner bestätigt. Ändern geht nur über MarkItch.");
  const [submission] = await db
    .select({ id: castingSubmissions.id, brandId: castingSubmissions.brandId })
    .from(castingSubmissions)
    .where(and(eq(castingSubmissions.id, submissionId), eq(castingSubmissions.castingId, castingId)))
    .limit(1);
  if (!submission) return fail("Diese Bewerbung gibt es nicht.");

  await db
    .update(partnerCastings)
    .set({ partnerSubmissionId: submission.id, partnerConfirmedAt: new Date(), partnerRemovalRequestedAt: null, partnerRemovalNote: null })
    .where(eq(partnerCastings.id, castingId));

  const [host] = await db.select({ name: brands.name }).from(brands).where(eq(brands.id, hostBrandId)).limit(1);
  await notifyUsers(
    await getBrandMemberUserIds(submission.brandId),
    {
      de: `🤝 ${host?.name ?? "Eine Marke"} hat dich als offiziellen Partner bestätigt!`,
      en: `🤝 ${host?.name ?? "A brand"} confirmed you as its official partner!`,
    },
    `/castings/${castingId}`,
  ).catch(() => {});
  return { ok: true };
}

/** Marke des Castings oder der Partner beantragt, das Abzeichen zu entfernen — MarkItch prüft. */
export async function requestPartnerRemoval(brandId: string, castingId: string, rawNote: unknown): Promise<Result> {
  if (!partnerBadgeEnabled()) return fail("Das gibt es noch nicht.");
  const note = typeof rawNote === "string" ? rawNote.trim().slice(0, 500) : "";
  if (!note) return fail("Bitte schreib kurz, warum das Abzeichen weg soll.");
  const casting = await loadCasting(castingId);
  const partner = casting ? await getCastingPartner(castingId) : null;
  if (!casting || !partner) return fail("Für dieses Casting gibt es kein Abzeichen.");
  if (brandId !== casting.hostBrandId && brandId !== partner.brandId) return fail("Nur die beiden Marken können das beantragen.");
  if (partner.removalRequested) return fail("Schon beantragt — wir melden uns.");

  await db
    .update(partnerCastings)
    .set({ partnerRemovalRequestedAt: new Date(), partnerRemovalNote: note })
    .where(eq(partnerCastings.id, castingId));
  const [requester] = await db.select({ name: brands.name }).from(brands).where(eq(brands.id, brandId)).limit(1);
  await notifyUsers(
    await adminUserIds(),
    {
      de: `🤝 ${requester?.name ?? "Eine Marke"} möchte ein Partner-Abzeichen entfernen lassen: „${note}“`,
      en: `🤝 ${requester?.name ?? "A brand"} asked to remove a partner badge: “${note}”`,
    },
    `/castings/${castingId}`,
  ).catch(() => {});
  return { ok: true };
}

/** Admin: Antrag annehmen (Abzeichen weg) oder ablehnen (bleibt). */
export async function decidePartnerRemoval(castingId: string, remove: boolean): Promise<Result> {
  if (!partnerBadgeEnabled()) return fail("Das gibt es noch nicht.");
  const casting = await loadCasting(castingId);
  const partner = casting ? await getCastingPartner(castingId) : null;
  if (!casting || !partner) return fail("Für dieses Casting gibt es kein Abzeichen.");

  await db
    .update(partnerCastings)
    .set(
      remove
        ? { partnerSubmissionId: null, partnerConfirmedAt: null, partnerRemovalRequestedAt: null, partnerRemovalNote: null }
        : { partnerRemovalRequestedAt: null, partnerRemovalNote: null },
    )
    .where(eq(partnerCastings.id, castingId));

  const memberIds = [...new Set([...(await getBrandMemberUserIds(casting.hostBrandId)), ...(await getBrandMemberUserIds(partner.brandId))])];
  await notifyUsers(
    memberIds,
    remove
      ? { de: "🤝 Das Partner-Abzeichen wurde entfernt.", en: "🤝 The partner badge was removed." }
      : { de: "🤝 Das Partner-Abzeichen bleibt bestehen.", en: "🤝 The partner badge stays." },
    `/castings/${castingId}`,
  ).catch(() => {});
  return { ok: true };
}
