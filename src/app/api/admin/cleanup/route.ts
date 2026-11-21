import { NextRequest, NextResponse } from "next/server";
import { asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, users } from "@/db/schema";
import { checkAdminKey } from "@/lib/admin-key";
import { apiError } from "@/lib/api-error";

/**
 * Luca 21.11.: vor dem Start alles leer räumen. Nur die eigenen Konten
 * bleiben (keepEmails), alle anderen Konten samt ihrer Marken werden
 * gelöscht, dazu ALLE Inhalte (Videos, Duelle, Reaktionen, Meinungen,
 * Likes, Stimmen, Castings, Umfragen, Benachrichtigungen, Statistik …).
 * Konten, Marken-Profile (Logo, Banner, Beschreibung) und Follows der
 * behaltenen Konten bleiben. Videodateien räumt danach der Aufräum-Cron weg.
 *
 * POST mit Header x-admin-key:
 *   {}                                   → nur alle Konten auflisten
 *   {"keepEmails": [...]}                → Probelauf: was gelöscht würde
 *   {"keepEmails": [...], "confirm": true} → wirklich löschen
 */

// Reihenfolge egal (Transaktion, Fremdschlüssel löschen kaskadierend mit).
const CONTENT_TABLES = [
  "duel_poll_votes",
  "duel_poll_options",
  "duel_polls",
  "guest_votes",
  "votes",
  "likes",
  "comments",
  "battle_reminders",
  "casting_votes",
  "casting_submissions",
  "partner_castings",
  "creator_votes",
  "creator_submissions",
  "creator_challenges",
  "reactions",
  "battles",
  "challenges",
  "solo_pitches",
  "boosts",
  "reports",
  "notifications",
  "post_drafts",
  "video_thumbnails",
  "video_music",
  "video_trims",
  "saved_codes",
  "saved_videos",
  "hidden_content",
  "seen_content",
  "brand_analytics_events",
  "visitor_events",
] as const;

async function tableCounts() {
  const out: Record<string, number> = {};
  for (const table of CONTENT_TABLES) {
    const res = await db.execute(sql.raw(`select count(*)::int as n from "${table}"`));
    out[table] = Number((res.rows[0] as { n: number }).n);
  }
  return out;
}

export async function POST(request: NextRequest) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);

  const accounts = await db
    .select({ id: users.id, email: users.email, name: users.name, accountType: users.accountType, brand: brands.name, brandSlug: brands.slug })
    .from(users)
    .leftJoin(brandMembers, eq(brandMembers.userId, users.id))
    .leftJoin(brands, eq(brands.id, brandMembers.brandId))
    .orderBy(asc(users.createdAt));

  if (!Array.isArray(body?.keepEmails)) {
    return NextResponse.json({ accounts: accounts.map((a) => ({ email: a.email, name: a.name, accountType: a.accountType, brand: a.brand, brandSlug: a.brandSlug })) });
  }

  const keep = new Set((body.keepEmails as unknown[]).filter((e): e is string => typeof e === "string").map((e) => e.trim().toLowerCase()));
  const keptIds = [...new Set(accounts.filter((a) => keep.has(a.email.toLowerCase())).map((a) => a.id))];
  if (keptIds.length === 0) return await apiError({ error: "Keine der keepEmails gefunden — abgebrochen." }, { status: 400 });
  const missing = [...keep].filter((e) => !accounts.some((a) => a.email.toLowerCase() === e));

  const deleteAccounts = accounts.filter((a) => !keptIds.includes(a.id));
  const deleteUserIds = [...new Set(deleteAccounts.map((a) => a.id))];
  // Marken ohne behaltenes Mitglied fallen weg.
  const keptBrandIds = (await db.select({ id: brandMembers.brandId }).from(brandMembers).where(inArray(brandMembers.userId, keptIds))).map((r) => r.id);
  const deleteBrands = await db
    .select({ id: brands.id, name: brands.name, slug: brands.slug })
    .from(brands)
    .where(keptBrandIds.length ? notInArray(brands.id, keptBrandIds) : sql`true`);

  const summary = {
    keep: accounts.filter((a) => keptIds.includes(a.id)).map((a) => ({ email: a.email, brand: a.brand })),
    missingKeepEmails: missing,
    deleteAccounts: deleteAccounts.map((a) => ({ email: a.email, name: a.name, brand: a.brand })),
    deleteBrands: deleteBrands.map((b) => b.name),
    contentRows: await tableCounts(),
  };
  if (body?.confirm !== true) return NextResponse.json({ dryRun: true, ...summary });

  await db.transaction(async (tx) => {
    for (const table of CONTENT_TABLES) await tx.execute(sql.raw(`delete from "${table}"`));
    if (deleteBrands.length) await tx.delete(brands).where(inArray(brands.id, deleteBrands.map((b) => b.id)));
    if (deleteUserIds.length) await tx.delete(users).where(inArray(users.id, deleteUserIds));
  });
  return NextResponse.json({ deleted: true, ...summary, contentRowsAfter: await tableCounts() });
}
