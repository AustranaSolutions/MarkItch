import type { brands } from "@/db/schema";
import { withHttps } from "@/lib/cta-link";

// Luca 24.10.: neues Profil — „Button im Profil“, Standort und Info-Blatt.
// Client-sicher (keine DB), damit Web und Server dieselben Listen nutzen.

/** Genau ein Button pro Profil, aus einer festen Liste (kein freier Text → einheitlich, kein Spam). */
export const PROFILE_BUTTON_TYPES = ["booking", "call", "reserve", "inquiry", "shop", "app", "website", "music", "none"] as const;
export type ProfileButtonType = (typeof PROFILE_BUTTON_TYPES)[number];

export const PROFILE_BUTTON_LABELS: Record<ProfileButtonType, string> = {
  booking: "Termin buchen",
  call: "Anrufen",
  reserve: "Reservieren",
  inquiry: "Anfrage senden",
  shop: "Zum Shop",
  app: "App laden",
  website: "Website",
  music: "Meine Musik",
  none: "Kein Button",
};

/** Woher der Button sein Ziel nimmt: eigener Link, Telefon-, E-Mail- oder Website-Feld. */
export function profileButtonSource(type: ProfileButtonType): "link" | "phone" | "email" | "website" | null {
  if (type === "call") return "phone";
  if (type === "inquiry") return "email";
  if (type === "website") return "website";
  if (type === "none") return null;
  return "link";
}

export const LOCATION_TYPES = ["address", "area", "online"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export function parseProfileButtonType(raw: unknown): ProfileButtonType | null {
  return typeof raw === "string" && (PROFILE_BUTTON_TYPES as readonly string[]).includes(raw) ? (raw as ProfileButtonType) : null;
}

export function parseLocationType(raw: unknown): LocationType | null {
  return typeof raw === "string" && (LOCATION_TYPES as readonly string[]).includes(raw) ? (raw as LocationType) : null;
}

/** Vorauswahl je Kategorie — nur ein Vorschlag in den Einstellungen, jederzeit änderbar. */
export function defaultProfileButton(kind: string, category: string): ProfileButtonType {
  if (kind === "creator") return category === "Music" ? "music" : "none";
  switch (category) {
    case "Salon":
    case "Gym":
      return "booking";
    case "Craft":
    case "Automotive":
      return "call";
    case "Gastronomy":
    case "Food":
      return "reserve";
    case "Fashion":
    case "Beauty":
      return "shop";
    case "Tech":
    case "Gaming":
    case "Startup":
      return "app";
    default:
      return "website";
  }
}

const LIMITS = { description: 500, locationLabel: 60, address: 200, phone: 30, contactEmail: 200, openingHours: 300, imprint: 1500, url: 500 } as const;

export type BrandDetailsValues = {
  profileButtonType?: ProfileButtonType | null;
  profileButtonUrl?: string | null;
  locationType?: LocationType | null;
  locationLabel?: string | null;
  address?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  openingHours?: string | null;
  imprint?: string | null;
  website?: string | null;
  description?: string | null;
};

type FieldErrors = Record<string, string[]>;

function text(raw: unknown, max: number): string | null | undefined {
  if (raw === undefined || raw === null) return undefined; // nicht mitgeschickt → unverändert
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** http(s) und eine echte Domain mit Punkt („https://f“ zählt nicht). */
function isRealLink(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && /\.[a-z]{2,}$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

const PHONE_RE = /^\+?[0-9][0-9 ()/-]{4,28}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Liest nur die mitgeschickten Felder (fehlende bleiben unverändert) und
 * prüft sie. `get` liefert Werte aus FormData oder JSON.
 */
export function parseBrandDetails(get: (key: string) => unknown): { values: BrandDetailsValues } | { errors: FieldErrors } {
  const errors: FieldErrors = {};
  const values: BrandDetailsValues = {};

  const buttonRaw = get("profileButtonType");
  if (buttonRaw !== undefined && buttonRaw !== null) {
    const type = parseProfileButtonType(buttonRaw);
    if (!type) errors.profileButtonType = ["Bitte einen Button wählen."];
    else values.profileButtonType = type;
  }

  const url = text(get("profileButtonUrl"), LIMITS.url);
  if (url !== undefined) {
    if (url === null) values.profileButtonUrl = null;
    else {
      const withScheme = withHttps(url);
      if (isRealLink(withScheme)) {
        values.profileButtonUrl = withScheme;
      } else {
        errors.profileButtonUrl = ["Bitte einen gültigen Link eingeben (z. B. meinsalon.at/termin)."];
      }
    }
  }

  // Website hängt auch am Button „Website“ — darum hier ebenfalls änderbar.
  const website = text(get("website"), LIMITS.url);
  if (website !== undefined) {
    if (website === null) values.website = null;
    else {
      const withScheme = withHttps(website);
      if (isRealLink(withScheme)) values.website = withScheme;
      else errors.website = ["Bitte eine gültige Website eingeben."];
    }
  }

  const locationRaw = get("locationType");
  if (locationRaw !== undefined && locationRaw !== null) {
    if (locationRaw === "") values.locationType = null;
    else {
      const type = parseLocationType(locationRaw);
      if (!type) errors.locationType = ["Bitte Standort-Art wählen."];
      else values.locationType = type;
    }
  }

  const fields = ["description", "locationLabel", "address", "openingHours", "imprint"] as const;
  for (const key of fields) {
    const value = text(get(key), LIMITS[key]);
    if (value !== undefined) values[key] = value;
  }

  const phone = text(get("phone"), LIMITS.phone);
  if (phone !== undefined) {
    if (phone !== null && !PHONE_RE.test(phone)) errors.phone = ["Bitte eine gültige Telefonnummer eingeben."];
    else values.phone = phone;
  }

  const email = text(get("contactEmail"), LIMITS.contactEmail);
  if (email !== undefined) {
    if (email !== null && !EMAIL_RE.test(email)) errors.contactEmail = ["Bitte eine gültige E-Mail-Adresse eingeben."];
    else values.contactEmail = email;
  }

  return Object.keys(errors).length ? { errors } : { values };
}

/** Was das Profil oben unter dem Namen zeigt — „Online“ bei Online-Firmen, sonst Ort bzw. Einsatzgebiet. */
export function publicLocationLabel(type: string | null, label: string | null): string | null {
  if (type === "online") return label || "Online";
  return label || null;
}

/** Deutsche Namen der Kategorie-Schlüssel (in der Datenbank bleiben die englischen). */
const CATEGORY_LABELS: Record<string, string> = {
  Gastronomy: "Gastronomie",
  Salon: "Friseur & Kosmetik",
  Craft: "Handwerk",
  Gym: "Fitnessstudio",
  Food: "Essen & Trinken",
  Fashion: "Mode",
  Beauty: "Beauty & Pflege",
  Tech: "Technik",
  Automotive: "Auto & Mobilität",
  Gaming: "Gaming",
  "Local Business": "Sonstiges Geschäft",
  Startup: "Start-up",
  Other: "Sonstiges",
  Comedy: "Comedy & Unterhaltung",
  Fitness: "Fitness & Sport",
  Lifestyle: "Lifestyle",
  Music: "Musik",
  Travel: "Reisen",
  Education: "Wissen & Bildung",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

type ButtonSource = {
  profileButtonType: string | null;
  profileButtonUrl: string | null;
  phone: string | null;
  contactEmail: string | null;
  website: string | null;
};

/** Der eine Button im Profil — nur, wenn sein Ziel auch ausgefüllt ist. */
export function profileButtonOf(brand: ButtonSource): { type: ProfileButtonType; label: string; target: string } | null {
  const type = parseProfileButtonType(brand.profileButtonType);
  if (!type) return null;
  const source = profileButtonSource(type);
  const target =
    source === "phone"
      ? brand.phone && `tel:${brand.phone.replace(/[^+0-9]/g, "")}`
      : source === "email"
        ? brand.contactEmail && `mailto:${brand.contactEmail}`
        : source === "website"
          ? brand.website
          : source === "link"
            ? brand.profileButtonUrl
            : null;
  return target ? { type, label: PROFILE_BUTTON_LABELS[type], target } : null;
}

/** Was das Info-Fenster (⋯ → Info) zeigt. */
export type PublicBrandDetails = {
  description: string | null;
  address: string | null;
  phone: string | null;
  contactEmail: string | null;
  website: string | null;
  openingHours: string | null;
  imprint: string | null;
};

/** Luca 24.10.: alles, was der neue Profilkopf (Web) braucht — aus der Marken-Zeile. */
export function profileHeaderOf(brand: typeof brands.$inferSelect, accentColor: string) {
  return {
    brand: {
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl,
      bannerUrl: brand.bannerUrl,
      accentColor,
      introVideoUrl: brand.videoUrl,
      verified: brand.verifiedAt !== null,
      kind: brand.kind,
      categoryLabel: categoryLabel(brand.category),
      locationType: brand.locationType,
      locationLabel: publicLocationLabel(brand.locationType, brand.locationLabel),
    },
    details: {
      description: brand.description,
      address: brand.locationType === "address" ? brand.address : null,
      phone: brand.phone,
      contactEmail: brand.contactEmail,
      website: brand.website,
      openingHours: brand.openingHours,
      imprint: brand.imprint,
    } satisfies PublicBrandDetails,
    button: profileButtonOf(brand),
  };
}
