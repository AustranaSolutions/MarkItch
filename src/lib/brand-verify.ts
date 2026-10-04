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
      })
      .from(brands)
      .orderBy(asc(brands.name)),
    db.select({ brandId: brandMembers.brandId, email: users.email }).from(brandMembers).innerJoin(users, eq(brandMembers.userId, users.id)),
  ]);
  const nameCounts = new Map<string, number>();
  for (const r of rows) nameCounts.set(normalize(r.name), (nameCounts.get(normalize(r.name)) ?? 0) + 1);
  return rows.map((r) => ({
    ...r,
    ownerEmails: members.filter((m) => m.brandId === r.id).map((m) => m.email),
    lookalike: (nameCounts.get(normalize(r.name)) ?? 0) > 1,
  }));
}

export async function setBrandVerified(brandId: string, verified: boolean): Promise<void> {
  await db
    .update(brands)
    .set({ verifiedAt: verified ? new Date() : null })
    .where(eq(brands.id, brandId));
}
