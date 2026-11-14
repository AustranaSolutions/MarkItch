import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, users } from "@/db/schema";

// Audit 04.10. (C1): Luca prüft Marken von Hand (echte Firma, echter
// Inhaber) und vergibt den „Verifiziert“-Haken unter /admin/brands.

export type AdminBrandRow = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  createdAt: Date;
  verifiedAt: Date | null;
  ownerEmails: string[];
  /** Ein anderer Markenname sieht gleich aus (Altbestand vor dem Dubletten-Verbot). */
  lookalike: boolean;
  /** Luca 13.11. (Phase 4): "brand" | "creator". */
  kind: string;
  /** Prüfung per Code beantragt: dieser Code muss unter diesem Link stehen. */
  verificationRequest: { code: string; url: string; requestedAt: Date } | null;
};

const normalize = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export async function listBrandsForAdmin(): Promise<AdminBrandRow[]> {
  const [rows, members] = await Promise.all([
    db
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
        website: brands.website,
        createdAt: brands.createdAt,
        verifiedAt: brands.verifiedAt,
        kind: brands.kind,
        verificationCode: brands.verificationCode,
        verificationUrl: brands.verificationUrl,
        verificationRequestedAt: brands.verificationRequestedAt,
      })
      .from(brands)
      .orderBy(asc(brands.name)),
    db.select({ brandId: brandMembers.brandId, email: users.email }).from(brandMembers).innerJoin(users, eq(brandMembers.userId, users.id)),
  ]);
  const nameCounts = new Map<string, number>();
  for (const r of rows) nameCounts.set(normalize(r.name), (nameCounts.get(normalize(r.name)) ?? 0) + 1);
  return rows.map(({ verificationCode, verificationUrl, verificationRequestedAt, ...r }) => ({
    ...r,
    verificationRequest:
      !r.verifiedAt && verificationRequestedAt && verificationCode && verificationUrl
        ? { code: verificationCode, url: verificationUrl, requestedAt: verificationRequestedAt }
        : null,
    ownerEmails: members.filter((m) => m.brandId === r.id).map((m) => m.email),
    lookalike: (nameCounts.get(normalize(r.name)) ?? 0) > 1,
  }));
}

export async function setBrandVerified(brandId: string, verified: boolean): Promise<void> {
  await db
    .update(brands)
    // Luca 13.11.: Entscheidung getroffen → offene Prüf-Anfrage erledigt.
    .set({ verifiedAt: verified ? new Date() : null, verificationRequestedAt: null })
    .where(eq(brands.id, brandId));
}
