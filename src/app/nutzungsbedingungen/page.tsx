import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="space-y-2 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="text-white">{children}</strong>;
}

// Luca 18.10.: neu gefasst nach der Prüfung MARKITCH-RECHTSTEXTE-PRUEFUNG-
// 2026-10-18.md (KSchG, DSA, UWG, MedienG, App-Store-Richtlinien). Bei
// wesentlichen Änderungen TERMS_VERSION in lib/legal.ts und „Stand“ hier
// anpassen — App und Web fragen dann alle Konten erneut nach Zustimmung.
// Entwurf, kein Rechtsrat — vor dem öffentlichen Start anwaltlich prüfen.
export default function NutzungsbedingungenPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Nutzungsbedingungen</h1>
      <p className="mb-6 text-xs text-zinc-600">Stand: 18. Oktober 2026 · gilt für die App MarkItch und www.markitch.com</p>

      <Section title="1. Wer wir sind, wofür das gilt">
        <p>
          MarkItch ist eine Plattform für kurze Videos, auf der Unternehmen und Creator sich präsentieren und in
          Duellen gegeneinander antreten, über die das Publikum abstimmt. Betreiberin ist die Austrana Solutions KG
          (siehe{" "}
          <Link href="/impressum" className="text-orange-400 hover:underline">
            Impressum
          </Link>
          ). Diese Bedingungen gelten für die App und die Website. Mit der Registrierung stimmst du ihnen zu. Wie wir
          mit deinen Daten umgehen, steht in der{" "}
          <Link href="/datenschutz" className="text-orange-400 hover:underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
        <p>
          Die Nutzung ist kostenlos. Sollten wir einmal bezahlte Funktionen anbieten (z. B. Reichweite für Videos),
          gelten dafür eigene Bedingungen, denen du vorher gesondert zustimmst.
        </p>
      </Section>

      <Section title="2. Dein Konto">
        <p>
          Du musst mindestens 16 Jahre alt sein. Es gibt drei Kontoarten: <B>Zuschauer:in</B> (ansehen, abstimmen,
          liken, kommentieren, folgen, mit eigenen Videos reagieren), <B>Unternehmen/Marke</B> und <B>Creator</B>
          (zusätzlich eigene Videos posten und Duelle austragen).
        </p>
        <p>
          Pro Person ein Konto. Ein Unternehmens- oder Creator-Profil kann mehrere Teammitglieder haben, jedes mit
          eigenem Konto. Halte deine Angaben aktuell und dein Passwort geheim. Du kannst dein Konto jederzeit selbst in
          den Einstellungen löschen; bist du das letzte Mitglied eines Profils, wird es mit allen Inhalten gelöscht.
        </p>
      </Section>

      <Section title="3. Für Unternehmen und Creator">
        <p>
          <B>Berechtigung:</B> Du legst nur ein Profil für ein Unternehmen, eine Marke oder dich selbst an, das du
          vertreten darfst, und verwendest keine fremden Namen, Marken oder Logos. Wir dürfen Profile prüfen, mit einem
          Verifiziert-Haken versehen und bei falschen Angaben korrigieren oder entfernen.
        </p>
        <p>
          <B>Werbung ist erkennbar:</B> Videos von Unternehmen sind Werbung und werden automatisch als „Anzeige“
          gekennzeichnet. Creator müssen beim Posten „Bezahlte Kooperation / Werbung“ wählen, wenn sie für ein Video
          bezahlt werden, etwas gratis bekommen oder ein eigenes Produkt bewerben; das Video wird dann ebenfalls als
          „Anzeige“ gekennzeichnet (§ 26 MedienG, UWG). Schleichwerbung ist verboten.
        </p>
        <p>
          <B>Faire Duelle:</B> Ein Duell ist vergleichende Werbung (§ 2a UWG). Herabsetzende, irreführende oder
          unwahre Aussagen über andere Teilnehmer:innen oder deren Produkte sind verboten. Für die Rechtmäßigkeit
          deiner Werbung bist du selbst verantwortlich.
        </p>
        <p>
          <B>Verbotene Produkte:</B> keine Werbung für Tabakwaren, E-Zigaretten, verschreibungspflichtige
          Medikamente, Waffen, Glücksspiel oder sonst rechtlich unzulässige Produkte und Dienstleistungen. Werbung für
          Alkohol nur im Rahmen der gesetzlichen Beschränkungen und nie an Minderjährige gerichtet.
        </p>
        <p>
          <B>Preise und Gewinnspiele:</B> Verspricht ein Unternehmen oder Creator Preise, Rabatte oder Gewinne, ist
          es allein Veranstalter:in und für Teilnahmebedingungen und Abwicklung verantwortlich. Weder MarkItch noch
          Apple sind Veranstalter oder Sponsor.
        </p>
        <p>
          <B>Link unter dem Video:</B> Der Link muss zum Video passen und darf nicht auf rechtswidrige, irreführende
          oder schädliche Seiten führen.
        </p>
      </Section>

      <Section title="4. Deine Inhalte">
        <p>
          Du behältst alle Rechte an deinen Videos, Bildern und Texten. Du lädst nur hoch, woran du die nötigen Rechte
          hast: keine fremden Aufnahmen, Marken oder Musik ohne Erlaubnis, und alle erkennbaren Personen sind
          einverstanden. Wesentlich KI-generierte oder manipulierte Inhalte musst du beim Hochladen kennzeichnen.
        </p>
        <p>
          Du räumst uns ein einfaches, unentgeltliches, weltweites Recht ein, deine Inhalte für den Betrieb von
          MarkItch zu speichern, technisch zu bearbeiten (z. B. verkleinern, Vorschaubilder erzeugen), öffentlich
          anzuzeigen und zusammen mit anderen Inhalten darzustellen (Duelle, Reaktionen, Vorschauen beim Teilen,
          Story-Bilder). Das Recht endet, wenn du den Inhalt oder dein Konto löschst; bereits von anderen geteilte
          Links zeigen den Inhalt dann nicht mehr. In unserer eigenen Werbung zeigen wir deine Inhalte nur mit deiner
          ausdrücklichen Zustimmung.
        </p>
        <p>
          Wirst du von Dritten in Anspruch genommen, weil ein Inhalt von dir deren Rechte verletzt, hältst du uns
          schad- und klaglos, soweit du die Verletzung zu vertreten hast.
        </p>
      </Section>

      <Section title="5. Was nicht erlaubt ist">
        <p>
          Beleidigende, diskriminierende, bedrohende, gewaltverherrlichende, sexuell explizite oder sonst rechtswidrige
          Inhalte; Belästigung und Hass; Spam; Fake-Konten; das Umgehen von Sperren; automatisierte Zugriffe ohne
          unsere Erlaubnis. Hier gilt null Toleranz.
        </p>
      </Section>

      <Section title="6. Melden, Moderation, Sperren">
        <p>
          <B>Melden:</B> Jedes Video, jede Reaktion und jedes Profil lässt sich über „…“ melden, Kommentare per langem
          Drücken; außerdem per E-Mail an support@markitch.com. Konten, die dich stören, kannst du blockieren.
        </p>
        <p>
          <B>Automatische Maßnahmen:</B> Kommentare werden beim Absenden automatisch auf unzulässige Wörter, Links und
          Spam geprüft. Melden mindestens drei verschiedene Konten ein Video, wird es bis zur Prüfung ausgeblendet. Über
          Entfernungen und Sperren entscheidet ein Mensch.
        </p>
        <p>
          <B>Prüfung:</B> Wir prüfen Meldungen zeitnah, in der Regel innerhalb von 24 Stunden an Werktagen, und
          berücksichtigen dabei die Meinungsfreiheit und die Interessen aller Beteiligten.
        </p>
        <p>
          <B>Folgen:</B> je nach Schwere Entfernung des Inhalts, Verwarnung, befristete oder dauerhafte Sperre; bei
          wiederholten, offensichtlich unbegründeten Meldungen auch eine Sperre des meldenden Kontos. Wir teilen dir mit,
          was wir entfernt oder gesperrt haben und warum (Art. 17 DSA). Du kannst per E-Mail an support@markitch.com
          widersprechen; wir prüfen die Entscheidung dann erneut. Daneben stehen dir die gesetzlichen Wege offen.
        </p>
      </Section>

      <Section title="7. Abstimmen und Duelle">
        <p>
          Abstimmungen laufen blind: Vor Fristende sieht niemand, wer vorne liegt. Das offizielle Ergebnis ist der
          Stand bei Fristende und ändert sich danach nicht; später abgegebene Stimmen erscheinen nur als „aktueller
          Stand“. Wie du abstimmst, ist privat.
        </p>
        <p>
          Duelle dienen der Unterhaltung. Es ist kein Glücksspiel, und ein Sieg begründet keinen Anspruch auf Geld,
          Preise oder eine Zusammenarbeit, außer ein Unternehmen sagt das im Einzelfall ausdrücklich zu (siehe Punkt
          3). Manipulation ist verboten (Fake-Konten, gekaufte oder automatisierte Stimmen, koordinierte Abgaben).
          Verdächtige Stimmen können wir ohne Ankündigung entfernen.
        </p>
      </Section>

      <Section title="8. Verfügbarkeit und Haftung">
        <p>
          Wir bemühen uns um einen störungsfreien Betrieb, eine ständige Verfügbarkeit schulden wir aber nicht. Für
          Inhalte anderer Nutzer:innen haften wir erst, wenn wir von einer Rechtsverletzung wissen und nicht
          unverzüglich handeln.
        </p>
        <p>
          Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Personenschäden. Bei leichter
          Fahrlässigkeit haften wir gegenüber Unternehmer:innen nicht; gegenüber Verbraucher:innen nur für die
          Verletzung wesentlicher Pflichten und begrenzt auf den typischerweise vorhersehbaren Schaden. Zwingende
          gesetzliche Ansprüche bleiben unberührt.
        </p>
      </Section>

      <Section title="9. Kündigung">
        <p>
          Du kannst dein Konto jederzeit löschen. Wir können das Nutzungsverhältnis mit einer Frist von 30 Tagen
          beenden, bei schweren Verstößen gegen diese Bedingungen auch sofort.
        </p>
      </Section>

      <Section title="10. Änderungen">
        <p>
          Wesentliche Änderungen dieser Bedingungen kündigen wir mindestens 30 Tage vorher in der App und per E-Mail an.
          Sie gelten für dich erst, wenn du ihnen in der App oder auf der Website zustimmst. Stimmst du nicht zu,
          kannst du dein Konto jederzeit löschen.
        </p>
      </Section>

      <Section title="11. Apple App Store">
        <p>
          Lädst du die App aus dem App Store, gilt zusätzlich der Standard-Endnutzer-Lizenzvertrag von Apple. Diese
          Bedingungen bestehen nur zwischen dir und uns: Apple ist nicht Vertragspartner, nicht für die App, ihre
          Inhalte oder den Support verantwortlich und hat keine Gewährleistungspflichten. Apple und seine
          Tochtergesellschaften sind begünstigte Dritte dieser Bedingungen und können sie dir gegenüber durchsetzen.
        </p>
      </Section>

      <Section title="12. Recht und Gerichtsstand">
        <p>
          Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen und des UN-Kaufrechts. Bist du
          Verbraucher:in, bleiben die zwingenden Schutzvorschriften deines Wohnsitzstaats unberührt, und du kannst an
          deinem Wohnsitz klagen und geklagt werden. Für Unternehmer:innen ist Gerichtsstand Wien.
        </p>
        <p>
          Vertragssprache ist Deutsch. Ist eine Bestimmung unwirksam, bleibt der Rest gültig.
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
