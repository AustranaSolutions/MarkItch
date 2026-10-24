import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";

// Luca 24.10.: ohne eigenes Banner zeigt das Profil einen Verlauf in der
// Hauptfarbe des Logos. Einmal berechnet und in brands.accent_color gespeichert.

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Fester Farbton aus dem Namen — für Profile ohne Logo (immer gleich für dieselbe Marke). */
export function fallbackAccent(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  // HSL(hue, 55 %, 45 %) → RGB
  const s = 0.55;
  const l = 0.45;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

async function readLogo(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("/uploads/")) return await readFile(path.join(process.cwd(), "public", url));
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Hauptfarbe eines Logos: häufigste *farbige* Farbe — Weiß, Schwarz und Grau
 * (typischer Logo-Hintergrund) zählen nicht. Rein graue Logos → null
 * (dann Farbton aus dem Namen).
 */
export async function logoAccent(url: string): Promise<string | null> {
  const bytes = await readLogo(url);
  if (!bytes) return null;
  try {
    const { data, info } = await sharp(bytes).resize(48, 48, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max < 40 || min > 225 || (max - min) / max < 0.2) continue;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
    }
    let best: { count: number; r: number; g: number; b: number } | null = null;
    for (const bucket of buckets.values()) if (!best || bucket.count > best.count) best = bucket;
    // Unter ~3 % farbiger Fläche ist es eher ein schwarz-weißes Logo mit Farbklecks.
    if (!best || best.count < (info.width * info.height) / 33) return null;
    return toHex(best.r / best.count, best.g / best.count, best.b / best.count);
  } catch {
    return null;
  }
}

/** Farbe für den Banner-Verlauf; berechnet sie beim ersten Bedarf und speichert sie. */
export async function brandAccent(brand: { id: string; slug: string; logoUrl: string | null; accentColor: string | null }): Promise<string> {
  if (brand.accentColor) return brand.accentColor;
  const color = (brand.logoUrl ? await logoAccent(brand.logoUrl) : null) ?? fallbackAccent(brand.slug);
  await db.update(brands).set({ accentColor: color }).where(eq(brands.id, brand.id)).catch(() => {});
  return color;
}

/** Nach neuem Logo: alte Farbe verwerfen, beim nächsten Aufruf neu berechnen. */
export async function resetBrandAccent(brandId: string): Promise<void> {
  await db.update(brands).set({ accentColor: null }).where(eq(brands.id, brandId));
}
