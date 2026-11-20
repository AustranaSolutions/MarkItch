import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, users } from "@/db/schema";

/**
 * Luca 20.11.: Nutzerliste für Admins — wer und wie viele registriert sind,
 * getrennt nach Marken, Creator, Zuschauern (und Acro-Konten, die noch kein
 * Profil angelegt haben).
 */
export type AdminUserGroup = "brand" | "creator" | "viewer" | "noProfile";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  banned: boolean;
  brand: { name: string; slug: string } | null;
};

export type AdminUserList = {
  total: number;
  newLast7Days: number;
  groups: Record<AdminUserGroup, AdminUser[]>;
};

export async function listUsersForAdmin(): Promise<AdminUserList> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      accountType: users.accountType,
      createdAt: users.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      bannedAt: users.bannedAt,
      brandName: brands.name,
      brandSlug: brands.slug,
      brandKind: brands.kind,
    })
    .from(users)
    .leftJoin(brandMembers, eq(brandMembers.userId, users.id))
    .leftJoin(brands, eq(brands.id, brandMembers.brandId))
    .orderBy(desc(users.createdAt));

  const groups: Record<AdminUserGroup, AdminUser[]> = { brand: [], creator: [], viewer: [], noProfile: [] };
  const seen = new Set<string>();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let newLast7Days = 0;
  for (const r of rows) {
    // Mehrere Marken pro Konto → nur einmal zählen (erste Marke).
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    if (r.createdAt.getTime() >= weekAgo) newLast7Days++;
    const group: AdminUserGroup = r.brandName
      ? r.brandKind === "creator"
        ? "creator"
        : "brand"
      : r.accountType === "acro"
        ? "noProfile"
        : "viewer";
    groups[group].push({
      id: r.id,
      name: r.name,
      email: r.email,
      createdAt: r.createdAt.toISOString(),
      emailVerified: r.emailVerifiedAt !== null,
      banned: r.bannedAt !== null,
      brand: r.brandName && r.brandSlug ? { name: r.brandName, slug: r.brandSlug } : null,
    });
  }
  return { total: seen.size, newLast7Days, groups };
}
