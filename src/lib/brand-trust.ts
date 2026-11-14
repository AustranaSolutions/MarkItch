import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { battles, brandMembers, brands, soloPitches, users } from "@/db/schema";
import { withHttps } from "@/lib/cta-link";
import { notifyUsers } from "@/lib/notification";

// Luca 13.11. (Phase 4): Vertrauen in Konten.
// 1. Automatischer Haken, wenn die bestätigte E-Mail-Adresse eines Mitglieds
//    zur Website passt (info@baeckerei.at ↔ baeckerei.at).
// 2. Sonst Prüfung per Code: Code in Bio/Website, Link einreichen, Admin schaut nach.
// 3. Inaktive Unternehmen (60 Tage nichts gepostet) aus Suche/Vorschlägen ausblenden.

/** Freemail-Anbieter — gmail.com als „Website“ ist kein Beweis für irgendwas. */
const FREEMAIL = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "outlook.de", "outlook.at", "hotmail.com", "hotmail.de", "live.com", "live.at",
  "live.de", "msn.com", "icloud.com", "me.com", "mac.com", "yahoo.com", "yahoo.de", "ymail.com", "gmx.at", "gmx.de", "gmx.net",
  "gmx.com", "gmx.ch", "web.de", "aon.at", "a1.net", "chello.at", "t-online.de", "freenet.de", "posteo.de", "posteo.at",
  "mailbox.org", "proton.me", "protonmail.com", "pm.me", "tutanota.com", "tuta.io", "aol.com", "mail.com", "bluewin.ch",
  "kabsi.at", "drei.at", "magenta.at", "yandex.com", "zoho.com", "hey.com", "fastmail.com",
]);

/** Profil-Links (Instagram, TikTok, Maps …) — gültig als Pflicht-Link, aber kein Domain-Beweis. */
const SOCIAL_HOSTS = [
  "instagram.com", "tiktok.com", "facebook.com", "fb.com", "google.com", "goo.gl", "g.page", "maps.app.goo.gl", "youtube.com",
  "youtu.be", "linkedin.com", "x.com", "twitter.com", "linktr.ee", "threads.net", "pinterest.com", "snapchat.com", "spotify.com",
  "soundcloud.com", "wa.me", "whatsapp.com", "t.me", "beacons.ai", "bio.link", "linkin.bio", "carrd.co", "wixsite.com",
  "jimdosite.com", "jimdo.com", "business.site", "webnode.page", "myshopify.com", "etsy.com", "amazon.de", "amazon.com",
];

const endsWithDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

function hostOf(url: string): string | null {
  try {
    return new URL(withHttps(url)).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Passt die E-Mail-Domain zur Website? (auch Subdomains: mail.firma.at ↔ shop.firma.at nicht, firma.at ↔ shop.firma.at ja) */
export function emailMatchesWebsite(email: string, website: string | null): boolean {
  if (!website) return false;
  const emailDomain = email.split("@")[1]?.toLowerCase().trim();
  const host = hostOf(website);
  if (!emailDomain || !host || FREEMAIL.has(emailDomain)) return false;
  if (SOCIAL_HOSTS.some((s) => endsWithDomain(host, s))) return false;
  return endsWithDomain(host, emailDomain) || endsWithDomain(emailDomain, host);
}

/**
 * Setzt den Haken bei allen ungeprüften Marken dieses Nutzers, deren Website
 * zu seiner bestätigten E-Mail passt. Aufrufen nach Anlegen/Bearbeiten der
 * Marke und nach dem Bestätigen der E-Mail. Nimmt nie einen Haken weg.
 */
export async function autoVerifyBrandsForUser(userId: string): Promise<void> {
  const [user] = await db.select({ email: users.email, emailVerifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.emailVerifiedAt) return;
  const rows = await db
    .select({ id: brands.id, website: brands.website })
    .from(brands)
    .innerJoin(brandMembers, eq(brandMembers.brandId, brands.id))
    .where(and(eq(brandMembers.userId, userId), isNull(brands.verifiedAt)));
  const matching = rows.filter((b) => emailMatchesWebsite(user.email, b.website)).map((b) => b.id);
  if (matching.length === 0) return;
  await db
    .update(brands)
    .set({ verifiedAt: new Date(), verificationRequestedAt: null })
    .where(inArray(brands.id, matching));
}

// ——— Prüfung per Code ———

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O, 1/I

function newCode(): string {
  return `MARKITCH-${Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("")}`;
}

export type VerificationStatus = {
  verified: boolean;
  code: string;
  /** Eingereichter Link, falls eine Prüfung läuft. */
  requestedUrl: string | null;
  requestedAt: string | null;
  /** Website, falls gesetzt (Vorschlag für den Link). */
  website: string | null;
};

/** Status für die eigene Marke — legt den Code beim ersten Aufruf an (bleibt dann gleich). */
export async function getVerificationStatus(brandId: string): Promise<VerificationStatus | null> {
  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) return null;
  let code = brand.verificationCode;
  if (!code) {
    code = newCode();
    await db.update(brands).set({ verificationCode: code }).where(eq(brands.id, brandId));
  }
  return {
    verified: brand.verifiedAt !== null,
    code,
    requestedUrl: brand.verificationRequestedAt ? brand.verificationUrl : null,
    requestedAt: brand.verificationRequestedAt?.toISOString() ?? null,
    website: brand.website,
  };
}

async function adminUserIds(): Promise<string[]> {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return [];
  const rows = await db.select({ id: users.id }).from(users).where(inArray(sql`lower(${users.email})`, emails));
  return rows.map((r) => r.id);
}

/** Prüfung beantragen: Link zu Bio/Website, wo der Code steht. */
export async function requestVerification(brandId: string, rawUrl: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const input = typeof rawUrl === "string" ? withHttps(rawUrl) : "";
  let url: string;
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    url = parsed.toString();
  } catch {
    return { ok: false, error: "Bitte den Link zu deinem Profil oder deiner Website angeben." };
  }
  const status = await getVerificationStatus(brandId);
  if (!status) return { ok: false, error: "Du hast keine Marke." };
  if (status.verified) return { ok: false, error: "Dein Profil ist schon geprüft." };
  const [brand] = await db
    .update(brands)
    .set({ verificationUrl: url, verificationRequestedAt: new Date() })
    .where(eq(brands.id, brandId))
    .returning({ name: brands.name });
  await notifyUsers(
    await adminUserIds(),
    { de: `🔎 ${brand.name} möchte geprüft werden.`, en: `🔎 ${brand.name} asked to be verified.` },
    "/admin/brands",
  ).catch(() => {});
  return { ok: true };
}

// ——— Inaktive Unternehmen ———

export const INACTIVE_AFTER_DAYS = 60;

/**
 * SQL-Bedingung „taucht in Suche/Vorschlägen auf“: Creator immer; Unternehmen,
 * wenn sie in den letzten 60 Tagen angelegt wurden oder etwas gepostet haben
 * (Solo-Pitch oder Duell-Video). Ausgeblendet heißt nur: nicht vorgeschlagen —
 * Profil, Videos und Links bleiben erreichbar, nichts wird gelöscht.
 */
export function brandIsDiscoverable() {
  const cutoff = sql`now() - make_interval(days => ${INACTIVE_AFTER_DAYS})`;
  return sql`(
    ${brands.kind} <> 'brand'
    OR ${brands.createdAt} > ${cutoff}
    OR EXISTS (SELECT 1 FROM ${soloPitches} sp WHERE sp.brand_id = ${brands.id} AND sp.created_at > ${cutoff})
    OR EXISTS (
      SELECT 1 FROM ${battles} bt
      WHERE (bt.brand_a_id = ${brands.id} AND bt.brand_a_submitted_at > ${cutoff})
         OR (bt.brand_b_id = ${brands.id} AND bt.brand_b_submitted_at > ${cutoff})
    )
  )`;
}
