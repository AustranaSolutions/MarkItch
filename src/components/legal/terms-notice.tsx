import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { acceptTermsAction } from "@/app/actions/legal";
import { hasAcceptedCurrentTerms } from "@/lib/legal";

/**
 * Luca 18.10.: Neue Fassung der Nutzungsbedingungen/Datenschutzerklärung —
 * angemeldete Konten stimmen einmal zu (Gegenstück zum Hinweis in der App).
 */
export async function TermsNotice({ userId }: { userId: string }) {
  const [row] = await db.select({ termsVersion: users.termsVersion }).from(users).where(eq(users.id, userId)).limit(1);
  if (!row || hasAcceptedCurrentTerms(row)) return null;
  return (
    <div
      role="dialog"
      aria-label="Neue Nutzungsbedingungen"
      className="fixed inset-x-3 top-3 z-[95] mx-auto max-w-lg rounded-2xl border border-orange-500/40 bg-zinc-950 p-4 shadow-xl"
    >
      <p className="text-sm font-semibold text-white">Wir haben unsere Bedingungen aktualisiert</p>
      <p className="mt-1 text-sm text-zinc-300">
        Bitte lies die neuen{" "}
        <Link href="/nutzungsbedingungen" className="text-orange-400 hover:underline">
          Nutzungsbedingungen
        </Link>{" "}
        und die{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Datenschutzerklärung
        </Link>
        . Wenn du nicht zustimmen möchtest, kannst du dein Konto in den Einstellungen löschen.
      </p>
      <form action={acceptTermsAction} className="mt-3">
        <button type="submit" className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500">
          Zustimmen
        </button>
      </form>
    </div>
  );
}
