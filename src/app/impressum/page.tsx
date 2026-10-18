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
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Unternehmen</h2>
        <p>Rechtsform: Kommanditgesellschaft (KG), Sitz: Wien</p>
        <p>Vertretungsbefugt: Luca Lenz (unbeschränkt haftender Gesellschafter)</p>
        <p>Unternehmensgegenstand: Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik</p>
        <p>Gewerbe: Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik (freies Gewerbe)</p>
        <p>Gewerbebehörde: Magistrat der Stadt Wien</p>
        <p>
          Kammer: Wirtschaftskammer Wien, Fachgruppe Unternehmensberatung, Buchhaltung und Informationstechnologie
          (UBIT)
        </p>
        <p>
          Berufsrecht: Gewerbeordnung 1994, abrufbar unter{" "}
          <a href="https://www.ris.bka.gv.at" className="text-orange-400 hover:underline" rel="noopener noreferrer">
            www.ris.bka.gv.at
          </a>
        </p>
      </section>
      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Offenlegung gemäß § 25 MedienG
        </h2>
        <p>Medieninhaberin: Austrana Solutions KG, Edi-Finger-Straße 7/6/602, 1210 Wien</p>
        <p>
          Grundlegende Richtung: Plattform, auf der Unternehmen und Creator kurze Videos zeigen und in Duellen
          gegeneinander antreten, über die das Publikum abstimmt. Die Videos stammen von den jeweiligen Nutzer:innen.
        </p>
      </section>
      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Streitbeilegung</h2>
        <p>
          Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen. Anliegen klären wir gern direkt: support@markitch.com
        </p>
      </section>
      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Kontaktstelle nach dem Digital Services Act
        </h2>
        <p>Für Behörden und Nutzer:innen (Art. 11, 12 DSA): support@markitch.com — Deutsch oder Englisch.</p>
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
