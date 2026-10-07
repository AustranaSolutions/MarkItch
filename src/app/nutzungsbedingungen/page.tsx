import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="space-y-2 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

// Phase 15: Entwurf, kein Rechtsrat — insbesondere der Rechte-Abschnitt zu
// hochgeladenen Videos sollte vor echtem Live-Betrieb anwaltlich geprüft
// werden.
export default function NutzungsbedingungenPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Nutzungsbedingungen</h1>
      <p className="mb-6 text-xs text-zinc-600">Stand: 7. Oktober 2026</p>

      <Section title="Geltungsbereich">
        <p>
          Diese Nutzungsbedingungen gelten für alle registrierten Nutzer:innen von MarkItch, betrieben von der
          Austrana Solutions KG (siehe{" "}
          <Link href="/impressum" className="text-orange-400 hover:underline">
            Impressum
          </Link>
          ). Mit der Registrierung akzeptierst du sie.
        </p>
      </Section>

      <Section title="Dein Account">
        <p>
          Du bist für die Richtigkeit deiner Angaben und die Sicherheit deines Passworts selbst verantwortlich.
          Ein Account pro Person bzw. pro Marke. Als &quot;Acro&quot; (Marke) darfst du nur eine Marke vertreten, die du tatsächlich repräsentierst. Als &quot;Assent&quot; (Zuschauer:in) kannst du
        abstimmen, liken, kommentieren, folgen und mit eigenen Videos auf Marken-Videos reagieren. Für die Nutzung
        musst du mindestens 16 Jahre alt sein. Dein Konto kannst du jederzeit selbst in den Einstellungen löschen.
        </p>
      </Section>

      <Section title="Deine Inhalte (Videos, Kommentare)">
        <p>
          Du behältst die Rechte an deinen hochgeladenen Videos. Mit dem Hochladen räumst du uns das Recht ein, das
          Video auf der Plattform zu zeigen, zu speichern und (bei Duellen/Reaktionen) im Kontext anderer Videos
          darzustellen. Du darfst nur Inhalte hochladen, an denen du die nötigen Rechte hast — keine fremden
          Marken, Musik oder Aufnahmen ohne Erlaubnis.
        </p>
      </Section>

      <Section title="Verbotene Inhalte, Melden und Blockieren">
        <p>
          Anstößige, beleidigende, diskriminierende, gewaltverherrlichende, sexuell explizite oder anderweitig
          rechtswidrige Inhalte und missbräuchliches Verhalten gegenüber anderen sind auf MarkItch nicht erlaubt —
          dafür gilt null Toleranz.
        </p>
        <p>
          Kommentare werden beim Absenden automatisch auf unzulässige Wörter, Links und Spam geprüft. Unter
        deinen eigenen Videos kannst du Kommentare löschen. Jedes Video, jede Reaktion und jeden Kommentar kannst
        du melden. Wir prüfen Meldungen in der Regel innerhalb
          von 24 Stunden, entfernen unzulässige Inhalte und sperren die verantwortlichen Accounts. In der App
          kannst du außerdem Marken und Nutzer:innen blockieren — ihre Inhalte werden dir dann nicht mehr angezeigt.
        </p>
      </Section>

      <Section title="Fairness beim Voting">
        <p>
          Manipulation ist verboten: Fake-Accounts, automatisiertes/gekauftes Voting, koordinierte Stimmabgabe
          außerhalb normaler Nutzung. Wir setzen technische Maßnahmen (Ratenbegrenzung) dagegen ein und behalten
          uns vor, verdächtige Stimmen zu entfernen und Accounts zu sperren.
        </p>
      </Section>

      <Section title="Duelle und Ergebnisse">
        <p>
          Duelle und Abstimmungen dienen der Unterhaltung. Ein Sieg bringt keinen automatischen Anspruch auf Geld,
          Preise oder eine Zusammenarbeit — sofern eine Marke das für einen konkreten Fall nicht ausdrücklich
          anders zusagt.
        </p>
      </Section>

      <Section title="Sperrung und Kündigung">
        <p>
          Wir können Accounts bei Verstößen gegen diese Bedingungen sperren oder löschen. Du kannst dein Konto
          jederzeit selbst in den Einstellungen löschen oder über die Kontaktadresse im Impressum löschen lassen.
        </p>
      </Section>

      <Section title="Haftung">
        <p>
          Die Plattform wird ohne Gewähr für ständige Verfügbarkeit bereitgestellt. Für Inhalte, die Nutzer:innen
          hochladen, haften wir nicht als eigene Inhalte, sofern wir keine Kenntnis von deren Rechtswidrigkeit
          haben.
        </p>
      </Section>

      <Section title="Änderungen & Gerichtsstand">
        <p>
          Wir können diese Bedingungen ändern; wesentliche Änderungen kündigen wir an. Es gilt österreichisches
          Recht, Gerichtsstand ist Wien, soweit gesetzlich zulässig.
        </p>
      </Section>

      <p className="mt-8 text-xs text-zinc-600">
        Siehe auch{" "}
        <Link href="/impressum" className="text-orange-400 hover:underline">
          Impressum
        </Link>{" "}
        und{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
    </div>
  );
}
