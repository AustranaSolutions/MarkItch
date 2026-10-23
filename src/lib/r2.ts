import "server-only";
import { AwsClient } from "aws4fetch";

// Luca 23.10.: Videos und Bilder liegen in Cloudflare R2 (Bucket in der EU,
// Abrufen kostet nichts). Aktiv erst, wenn ALLE Variablen gesetzt sind —
// inkl. R2_PUBLIC_URL (https://media.markitch.com). Bis dahin läuft alles
// unverändert über Supabase Storage (siehe storage.ts).
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const JURISDICTION = process.env.R2_JURISDICTION;
const PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");

export const r2Enabled = Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_URL);

let client: AwsClient | null = null;
function r2(): AwsClient {
  client ??= new AwsClient({
    accessKeyId: ACCESS_KEY_ID!,
    secretAccessKey: SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
  return client;
}

function endpoint(): string {
  const eu = JURISDICTION === "eu" ? ".eu" : "";
  return `https://${ACCOUNT_ID}${eu}.r2.cloudflarestorage.com/${BUCKET}`;
}

function objectUrl(key: string): string {
  return `${endpoint()}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Öffentliche Adresse eines Objekts (über die eigene Domain). */
export function r2PublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

/** Präfix aller öffentlichen R2-Adressen — für Prüfungen „gehört diese URL uns?“. */
export function r2PublicPrefix(): string {
  return `${PUBLIC_URL}/`;
}

/** Signierte Adresse, an die App/Browser die Datei direkt per PUT schicken (1 Stunde gültig). */
export async function r2PresignedPut(key: string): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", "3600");
  const signed = await r2().sign(url.toString(), { method: "PUT", aws: { signQuery: true } });
  return signed.url;
}

export async function r2Put(key: string, body: Uint8Array, contentType: string): Promise<void> {
  // Über die signierte Adresse wie beim App-Upload, nicht über aws4fetch.fetch:
  // dort ging der Body auf Vercel als Stream ohne Content-Length raus (R2: 411).
  const res = await fetch(await r2PresignedPut(key), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: body as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
}

export async function r2Exists(key: string): Promise<boolean> {
  const res = await r2().fetch(objectUrl(key), { method: "HEAD" });
  return res.ok;
}

export async function r2Delete(key: string): Promise<void> {
  const res = await r2().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: ${res.status}`);
}

export type R2Object = { key: string; lastModified: Date };

/** Alle Objekte unter einem Präfix (ListObjectsV2, seitenweise). */
export async function r2List(prefix: string): Promise<R2Object[]> {
  const out: R2Object[] = [];
  let token: string | null = null;
  do {
    const url = new URL(endpoint());
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    if (token) url.searchParams.set("continuation-token", token);
    const res = await r2().fetch(url.toString());
    if (!res.ok) throw new Error(`R2 list failed: ${res.status} ${await res.text()}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = /<Key>([\s\S]*?)<\/Key>/.exec(m[1])?.[1];
      const modified = /<LastModified>([\s\S]*?)<\/LastModified>/.exec(m[1])?.[1];
      if (key) out.push({ key: decodeXml(key), lastModified: modified ? new Date(modified) : new Date() });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? (/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null)
      : null;
  } while (token);
  return out;
}

function decodeXml(text: string): string {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
