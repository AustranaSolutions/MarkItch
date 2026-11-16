import { NextRequest, NextResponse } from "next/server";
import { count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, soloPitches, users } from "@/db/schema";
import { checkAdminKey } from "@/lib/admin-key";
import { apiError } from "@/lib/api-error";

// Luca 16.11.: Testmarken samt Inhalten gezielt löschen (z. B. „ClaudeDebugBrand“).
// Ohne `confirm: true` nur Anzeige, was gelöscht würde. Die Marke nimmt per
// ON DELETE CASCADE Videos, Duelle, Stimmen, Kommentare usw. mit; deren
// Mitglieder-Konten werden mitgelöscht, wenn sie zu keiner anderen Marke gehören.
// Videodateien räumt der tägliche Cron weg. Echte Marken sind gesperrt.
//
// POST mit Header x-admin-key, Body {"slug": "…"} bzw. {"slug": "…", "confirm": true}.
const PROTECTED = new Set(["markitch", "test", "katijy"]);

export async function POST(request: NextRequest) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!slug) return await apiError({ error: "slug fehlt." }, { status: 400 });
  if (PROTECTED.has(slug)) return await apiError({ error: "Diese Marke ist geschützt." }, { status: 403 });

  const [brand] = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) return await apiError({ error: "Marke nicht gefunden." }, { status: 404 });

  const members = await db.select({ userId: brandMembers.userId }).from(brandMembers).where(eq(brandMembers.brandId, brand.id));
  const soleUserIds: string[] = [];
  for (const { userId } of members) {
    const [{ n }] = await db.select({ n: count() }).from(brandMembers).where(eq(brandMembers.userId, userId));
    if (n <= 1) soleUserIds.push(userId);
  }
  const [{ videos }] = await db.select({ videos: count() }).from(soloPitches).where(eq(soloPitches.brandId, brand.id));
  const summary = { slug, name: brand.name, videos, members: members.length, accountsDeleted: soleUserIds.length };

  if (body?.confirm !== true) return NextResponse.json({ dryRun: true, ...summary });

  await db.transaction(async (tx) => {
    await tx.delete(brands).where(eq(brands.id, brand.id));
    if (soleUserIds.length) await tx.delete(users).where(inArray(users.id, soleUserIds));
  });
  return NextResponse.json({ deleted: true, ...summary });
}
