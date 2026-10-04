import "server-only";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { VIDEO_UPLOAD_FOLDERS } from "@/lib/video-constants";

// Audit 04.10. (H5): Der Upload startet schon bei der Auswahl — wer danach
// abbricht, hinterlässt eine Datei, die nie gepostet wird. Ohne Aufräumen
// füllt sich der kostenlose Speicher (1 GB) mit der Zeit. Gelöscht wird nur,
// was ALLES erfüllt: liegt in einem Video-Ordner, ist älter als 48 Stunden
// und wird von keiner Tabelle verwendet (alle *video_url-Spalten).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "public-media";
const MIN_AGE_MS = 48 * 60 * 60 * 1000;

type StoredFile = { key: string; createdAt: Date };

/** Alle Video-Adressen, die irgendwo verwendet werden, als Speicher-Schlüssel („folder/…/datei.mp4“). */
async function referencedKeys(): Promise<Set<string>> {
  const rows = await db.execute<{ url: string }>(sql`
    SELECT video_url AS url FROM brands WHERE video_url IS NOT NULL
    UNION SELECT challenger_video_url FROM challenges WHERE challenger_video_url IS NOT NULL
    UNION SELECT brand_a_video_url FROM battles WHERE brand_a_video_url IS NOT NULL
    UNION SELECT brand_b_video_url FROM battles WHERE brand_b_video_url IS NOT NULL
    UNION SELECT video_url FROM solo_pitches
    UNION SELECT video_url FROM reactions
    UNION SELECT video_url FROM casting_submissions
    UNION SELECT video_url FROM creator_submissions
  `);
  const keys = new Set<string>();
  for (const { url } of rows) {
    const key = keyFromUrl(url);
    if (key) keys.add(key);
  }
  return keys;
}

function keyFromUrl(url: string): string | null {
  if (url.startsWith("/uploads/")) return decodeURIComponent(url.slice("/uploads/".length));
  const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

async function listSupabase(prefix: string): Promise<StoredFile[]> {
  const files: StoredFile[] = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`Supabase list failed: ${res.status} ${await res.text()}`);
    const entries = (await res.json()) as { name: string; id: string | null; created_at: string | null }[];
    for (const e of entries) {
      if (e.id === null) {
        // Unterordner (seit dem Audit: <folder>/<userId>/)
        files.push(...(await listSupabase(`${prefix}${e.name}/`)));
      } else if (e.created_at) {
        files.push({ key: `${prefix}${e.name}`, createdAt: new Date(e.created_at) });
      }
    }
    if (entries.length < 1000) return files;
  }
}

async function listLocal(dir: string, keyPrefix: string): Promise<StoredFile[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: StoredFile[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await listLocal(full, `${keyPrefix}${e.name}/`)));
    else if (e.isFile()) files.push({ key: `${keyPrefix}${e.name}`, createdAt: (await stat(full)).mtime });
  }
  return files;
}

export type CleanupResult = { checked: number; orphaned: string[]; deleted: number };

export async function cleanupOrphanedUploads({ dryRun }: { dryRun: boolean }): Promise<CleanupResult> {
  const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
  const files: StoredFile[] = [];
  for (const folder of VIDEO_UPLOAD_FOLDERS) {
    files.push(
      ...(useSupabase
        ? await listSupabase(`${folder}/`)
        : await listLocal(path.join(process.cwd(), "public", "uploads", folder), `${folder}/`)),
    );
  }
  // Erst NACH dem Auflisten die Verwendungen lesen: was dazwischen gepostet
  // wird, ist dann sicher als verwendet erfasst.
  const used = await referencedKeys();
  const cutoff = Date.now() - MIN_AGE_MS;
  const orphaned = files.filter((f) => f.createdAt.getTime() < cutoff && !used.has(f.key)).map((f) => f.key);

  let deleted = 0;
  if (!dryRun && orphaned.length > 0) {
    if (useSupabase) {
      for (let i = 0; i < orphaned.length; i += 100) {
        const batch = orphaned.slice(i, i + 100);
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prefixes: batch }),
        });
        if (!res.ok) throw new Error(`Supabase delete failed: ${res.status} ${await res.text()}`);
        deleted += batch.length;
      }
    } else {
      for (const key of orphaned) {
        await unlink(path.join(process.cwd(), "public", "uploads", key));
        deleted++;
      }
    }
  }
  return { checked: files.length, orphaned, deleted };
}
