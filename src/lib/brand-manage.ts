import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, brandMembers, users } from "@/db/schema";
import { getBrandForUser } from "@/lib/brand";
import { uploadImage } from "@/lib/storage";
import { validateImageFile } from "@/lib/account";
import { CreateBrandSchema, IndustryComplianceSchema } from "@/lib/validation";

// RN-4: Marke anlegen/bearbeiten — gemeinsam für die Web-Actions
// (actions/brand.ts) und die App-Route (/api/mobile/brand).

type FieldErrors = Record<string, string[]>;

export type BrandInput = {
  name: unknown;
  description: unknown;
  website: unknown;
  category: unknown;
  country: unknown;
  logo: File | null;
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60);
  return base || "marke";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;
  // Small table, small N — a loop is simpler and clearer than a clever query.
  while (true) {
    const [clash] = await db.select({ id: brands.id }).from(brands).where(eq(brands.slug, candidate)).limit(1);
    if (!clash) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/**
 * Audit 04.10. (C1): Ein Markenname darf nur einmal vorkommen — sonst kann
 * sich jemand als „Sprintex“ ausgeben. Verglichen wird ohne Groß-/Klein-
 * schreibung, Leerzeichen und Satzzeichen („Sprint-Ex“ = „sprintex“).
 */
async function nameTaken(name: string, exceptBrandId?: string): Promise<boolean> {
  const normalized = name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const sameName = sql`regexp_replace(lower(${brands.name}), '[^[:alnum:]]', '', 'g') = ${normalized}`;
  const [clash] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(exceptBrandId ? and(sameName, ne(brands.id, exceptBrandId)) : sameName)
    .limit(1);
  return Boolean(clash);
}

const NAME_TAKEN_ERROR = "Diesen Markennamen gibt es schon. Wenn das deine Marke ist, melde dich bei uns.";

function parseBrand(input: BrandInput) {
  return CreateBrandSchema.safeParse({
    name: input.name,
    description: input.description ?? "",
    website: input.website ?? "",
    category: input.category,
    country: input.country,
  });
}

async function uploadLogoIfAny(logo: File | null): Promise<{ url: string | null } | { errors: FieldErrors }> {
  if (!logo || logo.size === 0) return { url: null };
  const invalid = validateImageFile(logo, "logo", "Logo");
  if (invalid) return { errors: invalid };
  return { url: (await uploadImage(logo, "logos")).url };
}

export async function createBrandForUser(
  userId: string,
  input: BrandInput & { industryCompliance: unknown },
): Promise<{ ok: true; slug: string } | { ok: false; errors: FieldErrors }> {
  // Phase 8: nur Acro-Accounts besitzen eine Marke — das ist die eine
  // Schranke, alles Weitere (Posten, Einladen) verlangt ohnehin eine Marke.
  const [dbUser] = await db.select({ accountType: users.accountType }).from(users).where(eq(users.id, userId)).limit(1);
  if (dbUser?.accountType !== "acro") {
    return { ok: false, errors: { _form: ["Nur Acro-Accounts können eine Marke erstellen."] } };
  }
  const [existing] = await db.select({ id: brandMembers.id }).from(brandMembers).where(eq(brandMembers.userId, userId)).limit(1);
  if (existing) return { ok: false, errors: { _form: ["Du hast bereits eine Marke erstellt."] } };

  const parsed = parseBrand(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors as FieldErrors };

  if (await nameTaken(parsed.data.name)) return { ok: false, errors: { name: [NAME_TAKEN_ERROR] } };

  // Phase 46: Branchen-Compliance-Attestierung, nur bei der Erstellung.
  const compliance = IndustryComplianceSchema.safeParse({ industryCompliance: input.industryCompliance });
  if (!compliance.success) return { ok: false, errors: compliance.error.flatten().fieldErrors as FieldErrors };

  const logo = await uploadLogoIfAny(input.logo);
  if ("errors" in logo) return { ok: false, errors: logo.errors };

  const slug = await uniqueSlug(parsed.data.name);
  const [brand] = await db
    .insert(brands)
    .values({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      website: parsed.data.website || null,
      category: parsed.data.category,
      country: parsed.data.country,
      logoUrl: logo.url,
      industryComplianceConfirmedAt: new Date(),
    })
    .returning({ id: brands.id, slug: brands.slug });
  await db.insert(brandMembers).values({ brandId: brand.id, userId, role: "owner" });
  return { ok: true, slug: brand.slug };
}

/**
 * Phase 43: Marke nachträglich bearbeiten. Der Slug (/brands/…-Adresse)
 * ändert sich bewusst nie, auch nicht beim Umbenennen — sonst brechen alle
 * geteilten Links.
 */
export async function updateBrandForUser(
  userId: string,
  input: BrandInput,
): Promise<{ ok: true } | { ok: false; errors: FieldErrors }> {
  const brand = await getBrandForUser(userId);
  if (!brand) return { ok: false, errors: { _form: ["Du hast keine Marke."] } };

  const parsed = parseBrand(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors as FieldErrors };
  if (await nameTaken(parsed.data.name, brand.id)) return { ok: false, errors: { name: [NAME_TAKEN_ERROR] } };

  const logo = await uploadLogoIfAny(input.logo);
  if ("errors" in logo) return { ok: false, errors: logo.errors };

  await db
    .update(brands)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      website: parsed.data.website || null,
      category: parsed.data.category,
      country: parsed.data.country,
      logoUrl: logo.url ?? brand.logoUrl,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, brand.id));
  return { ok: true };
}
