import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { checkAdminKey } from "@/lib/admin-key";
import { r2Enabled, r2Exists, r2PublicPrefix, r2Put } from "@/lib/r2";

// Luca 23.10.: Umzug der bestehenden Videos und Bilder von Supabase Storage
// nach Cloudflare R2. Etappenweise (pro Aufruf höchstens `limit` Dateien),
// damit kein Aufruf ins Zeitlimit läuft; einfach wiederholen, bis
// `remaining` 0 ist. Pro Datei: erst nach R2 kopieren (Schlüssel bleibt
// gleich), prüfen, dass sie dort liegt, DANN die Adresse in der Datenbank
// umstellen. Die Originale bei Supabase bleiben unangetastet.
//
// POST mit Header x-admin-key, Body {"dryRun": true} (Standard) listet nur auf,
// {"dryRun": false, "limit": 20} kopiert und stellt um.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "public-media";

/** Alle Spalten mit Adressen hochgeladener Dateien. */
const URL_COLUMNS: [table: string, column: string][] = [
  ["users", "avatar_url"],
  ["brands", "logo_url"],
  ["brands", "video_url"],
  ["challenges", "challenger_video_url"],
  ["battles", "brand_a_video_url"],
  ["battles", "brand_b_video_url"],
  ["solo_pitches", "video_url"],
  ["reactions", "video_url"],
  ["casting_submissions", "video_url"],
  ["creator_submissions", "video_url"],
];

function supabasePrefix(): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/`;
}

async function pendingUrls(): Promise<string[]> {
  const prefix = `${supabasePrefix()}%`;
  const parts = URL_COLUMNS.map(
    ([table, column]) => sql`SELECT ${sql.identifier(column)} AS url FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} LIKE ${prefix}`,
  );
  const rows = await db.execute<{ url: string }>(sql.join(parts, sql` UNION `));
  return [...new Set(rows.map((r) => r.url))].sort();
}

async function repointUrl(oldUrl: string, newUrl: string): Promise<number> {
  let updated = 0;
  for (const [table, column] of URL_COLUMNS) {
    const res = await db.execute(
      sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = ${newUrl} WHERE ${sql.identifier(column)} = ${oldUrl}`,
    );
    updated += Number((res as unknown as { count?: number }).count ?? 0);
  }
  return updated;
}

export async function POST(request: NextRequest) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  if (!r2Enabled) return NextResponse.json({ error: "R2 ist noch nicht vollständig eingerichtet (R2_PUBLIC_URL?)." }, { status: 400 });
  if (!SUPABASE_URL) return NextResponse.json({ error: "Kein Supabase Storage konfiguriert." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const dryRun = body?.dryRun !== false;
  const limit = Math.min(Math.max(Number(body?.limit) || 20, 1), 50);

  const pending = await pendingUrls();
  if (dryRun) {
    return NextResponse.json({ dryRun: true, pending: pending.length, sample: pending.slice(0, 5) });
  }

  const results: { key: string; ok: boolean; rowsUpdated?: number; error?: string }[] = [];
  for (const url of pending.slice(0, limit)) {
    const key = decodeURIComponent(url.slice(supabasePrefix().length));
    try {
      if (!(await r2Exists(key))) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Download ${res.status}`);
        const contentType = res.headers.get("content-type") ?? "application/octet-stream";
        await r2Put(key, new Uint8Array(await res.arrayBuffer()), contentType);
        if (!(await r2Exists(key))) throw new Error("nach dem Kopieren nicht in R2 gefunden");
      }
      const rowsUpdated = await repointUrl(url, `${r2PublicPrefix()}${key}`);
      results.push({ key, ok: true, rowsUpdated });
    } catch (err) {
      results.push({ key, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    dryRun: false,
    processed: results.length,
    failed: failed.length,
    remaining: pending.length - (results.length - failed.length),
    errors: failed.slice(0, 10),
  });
}
