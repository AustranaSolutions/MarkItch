// Luca 18.10.: Fassung von Nutzungsbedingungen + Datenschutzerklärung, der
// zugestimmt werden muss. Bei jeder wesentlichen Änderung neues Datum
// eintragen (und „Stand“ auf beiden Seiten anpassen) — App und Web fragen
// dann alle Konten beim nächsten Öffnen erneut nach der Zustimmung.
export const TERMS_VERSION = "2026-10-18";

export function hasAcceptedCurrentTerms(user: { termsVersion: string | null }): boolean {
  return user.termsVersion === TERMS_VERSION;
}
