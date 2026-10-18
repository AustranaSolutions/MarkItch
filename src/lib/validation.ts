import * as z from "zod";

// Deliberately simple for Phase 1: at least 8 characters, one letter, one
// number. We can tighten this later without touching any call sites.
const passwordSchema = z
  .string()
  .min(8, "Mindestens 8 Zeichen.")
  .regex(/[a-zA-Z]/, "Mindestens ein Buchstabe.")
  .regex(/[0-9]/, "Mindestens eine Zahl.");

// Phase 8: every account is either an Acro (a brand — posts pitches,
// invites, replies) or an Assent (watches and votes, never owns a brand).
// Chosen once at registration; there's no UI to switch later yet.
export const AccountTypes = ["acro", "assent"] as const;

export const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt.").max(100).optional().or(z.literal("")),
  email: z.email("Ungültige E-Mail-Adresse.").trim().toLowerCase(),
  password: passwordSchema,
  accountType: z.enum(AccountTypes, "Bitte wähle Acro oder Assent."),
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt.").max(100).optional().or(z.literal("")),
  email: z.email("Ungültige E-Mail-Adresse.").trim().toLowerCase(),
});

export const LoginSchema = z.object({
  email: z.email("Ungültige E-Mail-Adresse.").trim().toLowerCase(),
  password: z.string().min(1, "Passwort fehlt."),
});

export const ForgotPasswordSchema = z.object({
  email: z.email("Ungültige E-Mail-Adresse.").trim().toLowerCase(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort fehlt."),
  newPassword: passwordSchema,
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Passwort fehlt."),
});

// Phase 2: brands. Category list matches the per-category rankings from the
// product spec; kept as a plain string column in the DB so adding one later
// is a code change, not a migration.
export const BrandCategories = [
  "Food",
  "Fashion",
  "Beauty",
  "Tech",
  "Automotive",
  "Gaming",
  "Local Business",
  "Startup",
  "Other",
] as const;

// Luca 18.10.: eigene Kategorien für Creator (Influencer) — gleiche Spalte.
export const CreatorCategories = [
  "Comedy",
  "Fitness",
  "Food",
  "Beauty",
  "Fashion",
  "Lifestyle",
  "Tech",
  "Gaming",
  "Music",
  "Travel",
  "Education",
  "Other",
] as const;

export const BrandCountries = ["AT", "DE", "CH", "Other"] as const;

export const CreateBrandSchema = z.object({
  name: z.string().trim().min(2, "Mindestens 2 Zeichen.").max(80, "Maximal 80 Zeichen."),
  description: z.string().trim().max(500, "Maximal 500 Zeichen.").optional().or(z.literal("")),
  website: z.union([z.url("Ungültige URL (z. B. https://example.com)."), z.literal("")]).optional(),
  category: z.enum([...new Set([...BrandCategories, ...CreatorCategories])] as [string, ...string[]], "Bitte Kategorie wählen."),
  country: z.enum(BrandCountries, "Bitte Land wählen."),
});

// Phase 46: nur bei der Erstellung abgefragt, siehe brands.industryComplianceConfirmedAt.
export const IndustryComplianceSchema = z.object({
  industryCompliance: z.literal("on", "Bitte bestätige, dass deine Marke keine gesperrten Produkte bewirbt."),
});

// Phase 46: Rechtskonformitäts-Audit — Musikrechte-Freistellung (Option A der
// PDF: "Rechtliche Freistellung (AGB)"), bei jedem Video-Upload mit Ton
// (Solo-Pitch, Duell-Video, Reaktion, Creator-Video, Casting-Einreichung).
export const AudioRightsSchema = z.object({
  audioRightsConfirmed: z.literal("on", "Bitte bestätige, dass du alle Rechte am Ton hältst."),
});
