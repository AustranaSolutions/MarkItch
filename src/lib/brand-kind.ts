// Luca 18.10.: Acro-Konten sind entweder eine Marke oder ein Creator
// (Influencer). Technisch dasselbe Konto — Unterschiede nur bei Texten,
// Kategorien und der Werbe-Kennzeichnung (DSA Art. 26 / § 26 MedienG):
// Marken-Inhalte sind immer „Anzeige“, Creator-Inhalte nur, wenn beim Posten
// „Bezahlte Kooperation / Werbung“ angetippt wurde.

export const BRAND_KINDS = ["brand", "creator"] as const;
export type BrandKind = (typeof BRAND_KINDS)[number];

export function parseBrandKind(value: unknown): BrandKind {
  return value === "creator" ? "creator" : "brand";
}

/** Nur Creator können eine Kooperation angeben — bei Marken ist ohnehin alles Werbung. */
export function readPaidPartnership(form: FormData, brand: { kind: string }): boolean {
  return brand.kind === "creator" && form.get("paidPartnership") === "on";
}

/** Steht am Video „Anzeige“? */
export function showsAdLabel(kind: string, paidPartnership: boolean): boolean {
  return kind !== "creator" || paidPartnership;
}
