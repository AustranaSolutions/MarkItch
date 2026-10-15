import Link from "next/link";

// Phase 15/41: Impressumspflicht (§ 5 ECG) gilt für ein öffentlich
// erreichbares, geschäftsmäßiges Telemedienangebot mit Registrierung —
// trifft schon jetzt zu, nicht erst "sobald echte Firmen mitmachen".
// Firmenbuchnummer/UID von Luca (2026-09-25). Firmenbuchgericht ist bei
// jeder Firma mit Sitz in Wien immer "Handelsgericht Wien" — Wien ist die
// einzige Stadt Österreichs mit einem eigenen, für das ganze Stadtgebiet
// (alle Bezirke) zuständigen Handelsgericht; überall sonst im Land ist es
// das jeweilige Landesgericht. Nicht erfunden, sondern eine feste
// gerichtsorganisatorische Tatsache, die direkt aus dem Sitz "1210 Wien"
// folgt — kein Rückfrage-Punkt.
export default function ImpressumPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Impressum</h1>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Angaben gemäß § 5 ECG</h2>
        <p>Austrana Solutions KG</p>
        <p>Edi-Finger-Straße 7/6/602</p>
        <p>1210 Wien</p>
        <p>Österreich</p>
        <p>Firmenbuchnummer: FN 673234 a</p>
        <p>Firmenbuchgericht: Handelsgericht Wien</p>
        <p>UID-Nummer: ATU83457527</p>
      </section>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Kontakt</h2>
        <p>E-Mail: office@markitch.com · Support: support@markitch.com</p>
      </section>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Verantwortlich für den Inhalt
        </h2>
        <p>Austrana Solutions KG, wie oben</p>
      </section>

      <p className="mt-8 text-xs text-zinc-600">
        Siehe auch{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Datenschutzerklärung
        </Link>{" "}
        und{" "}
        <Link href="/nutzungsbedingungen" className="text-orange-400 hover:underline">
          Nutzungsbedingungen
        </Link>
        .
      </p>
    </div>
  );
}
