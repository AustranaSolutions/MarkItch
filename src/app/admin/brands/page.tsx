import Link from "next/link";
import { requireAdminUser } from "@/lib/moderation";
import { listBrandsForAdmin } from "@/lib/brand-verify";
import { setBrandVerifiedAction } from "@/app/actions/brand-verify";

/**
 * Audit 04.10. (C1): Marken verifizieren. Erst nach eigener Prüfung (echte
 * Firma, Website passt, Inhaber erreichbar) — der Haken ist das Signal an
 * Zuschauer und Gegner, dass hier wirklich die Marke selbst postet.
 */
export default async function BrandsAdminPage() {
  await requireAdminUser();
  const rows = await listBrandsForAdmin();
  const unverified = rows.filter((r) => !r.verifiedAt);
  const verified = rows.filter((r) => r.verifiedAt);

  const row = (b: (typeof rows)[number]) => (
    <li key={b.id} className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 p-4">
      <div className="min-w-0">
        <a href={`/brands/${b.slug}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-white hover:underline">
          {b.name} ↗
        </a>
        {b.lookalike && <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-300">ähnlicher Name existiert</span>}
        <p className="mt-1 text-xs text-zinc-500">
          {b.website ?? "keine Website"} · {b.ownerEmails.join(", ") || "kein Inhaber"} · seit {b.createdAt.toLocaleDateString("de-AT")}
        </p>
      </div>
      <form action={setBrandVerifiedAction}>
        <input type="hidden" name="brandId" value={b.id} />
        {b.verifiedAt ? (
          <button className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500">
            Haken entfernen
          </button>
        ) : (
          <>
            <input type="hidden" name="verified" value="on" />
            <button className="shrink-0 rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-500">
              Verifizieren
            </button>
          </>
        )}
      </form>
    </li>
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Marken</h1>
        <Link href="/admin/moderation" className="text-sm text-zinc-500 hover:text-zinc-300">
          Moderation →
        </Link>
      </div>
      <p className="mb-8 text-sm text-zinc-400">
        Nur verifizieren, wenn du geprüft hast, dass das Konto wirklich zur Marke gehört (z. B. E-Mail auf der Domain der
        Marke oder persönlicher Kontakt).
      </p>
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-white">Nicht verifiziert ({unverified.length})</h2>
        <ul className="space-y-3">{unverified.map(row)}</ul>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Verifiziert ({verified.length})</h2>
        {verified.length === 0 ? <p className="text-sm text-zinc-500">Noch keine.</p> : <ul className="space-y-3">{verified.map(row)}</ul>}
      </section>
    </div>
  );
}
