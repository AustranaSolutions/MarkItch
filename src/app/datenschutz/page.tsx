import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="space-y-2 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

// Phase 15: Entwurf einer DSGVO-orientierten Datenschutzerklärung, abgeleitet
// aus dem tatsächlichen Datenmodell (src/db/schema.ts) und den tatsächlich
// eingesetzten Diensten — kein generischer Textbaustein. Das hier ist ein
// Entwurf, kein Rechtsrat — vor dem Onboarding echter Marken/Nutzer von
// einem Anwalt gegenprüfen lassen, gerade wegen der Video-Uploads und
// Push-Benachrichtigungen.
export default function DatenschutzPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Datenschutzerklärung</h1>
      <p className="mb-6 text-xs text-zinc-600">Stand: 7. Oktober 2026</p>

      <Section title="Verantwortlicher">
        <p>
          Austrana Solutions KG, Edi-Finger-Straße 7/6/602, 1210 Wien — siehe{" "}
          <Link href="/impressum" className="text-orange-400 hover:underline">
            Impressum
          </Link>
          . Kontakt für Datenschutzanliegen: markitch@outlook.de
        </p>
      </Section>

      <Section title="Welche Daten wir verarbeiten">
        <p>
          <strong className="text-white">Account:</strong> E-Mail-Adresse, Passwort (nur als Hash gespeichert, nie
          im Klartext), optionaler Anzeigename und Profilbild, Rolle (Acro/Assent). Bei Marken-Konten zusätzlich die
            Angaben zur Marke (Name, Logo, Beschreibung, Kategorie, Website) — diese sind öffentlich sichtbar.
        </p>
        <p>
          <strong className="text-white">Inhalte:</strong> von dir hochgeladene Videos, Kommentare, Likes, Stimmen
          bei Duellen, Reaktionen auf Pitches (auch als Zuschauer:in), wem du folgst, wen du blockierst und was du
            meldest. Videos, Reaktionen und Kommentare sind öffentlich sichtbar.
          </p>
          <p>
            <strong className="text-white">Automatische Prüfung von Kommentaren:</strong> Beim Absenden prüfen wir
            Kommentare automatisch auf unzulässige Wörter, Links und Spam. Dabei wird nichts zusätzlich gespeichert;
            abgelehnte Kommentare werden nicht veröffentlicht.
          </p>
        <p>
          <strong className="text-white">Technisch notwendig:</strong> IP-Adresse (kurzzeitig, ausschließlich zur
          Missbrauchs-/Manipulationserkennung bei Registrierung und Voting — siehe Abschnitt
          &quot;Sicherheit&quot;), Push-Zugangsdaten deines Browsers bzw. Geräts, sofern du Benachrichtigungen
            aktivierst. In der App wird dein Anmelde-Schlüssel nur verschlüsselt auf deinem Gerät gespeichert.
            Technische Fehlermeldungen (aufgerufene Seite, Fehlertext, Browser-Typ) landen kurzzeitig in den
            Protokollen unseres Hosters, damit wir Fehler beheben können.
          </p>
          <p>
            <strong className="text-white">Kamera, Mikrofon, Fotos (nur App):</strong> nur wenn du selbst ein Video
            aufnimmst oder ein Video/Bild auswählst, und nur nach deiner Freigabe in den iOS-Einstellungen.
          </p>
        <p>
          <strong className="text-white">Anonyme Reichweiten-Statistik:</strong> ein zufällig erzeugtes,
          nicht personenbezogenes Kennzeichen (im Browser als Cookie, in der App auf dem Gerät gespeichert), das lediglich zählt, wie viele Videos angesehen
          werden, ob Besuche wiederkehren und über welchen geteilten Link jemand kam — ohne Namen, E-Mail
          oder sonstigen Personenbezug, nie an Dritte weitergegeben. Marken sehen davon nur zusammengezählte
            Zahlen zu ihren eigenen Videos (Aufrufe, Link-Klicks), nie, wer etwas angesehen hat. Kein Tracking über
            andere Apps oder Websites hinweg, keine Werbe-Netzwerke.
          </p>
      </Section>

      <Section title="Wofür wir sie verwenden">
        <p>Um dir einen Account zu geben, deine Inhalte zu zeigen, Duelle/Abstimmungen zu ermöglichen und dich per Push zu benachrichtigen, wenn ein Ergebnis feststeht oder ein Pitch live geht. Rechtsgrundlage: Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) für die Kernfunktion, berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) für Missbrauchsschutz.</p>
      </Section>

      <Section title="Wer außer uns Zugriff hat (Auftragsverarbeiter)">
        <p>
          <strong className="text-white">Vercel</strong> — Hosting der Anwendung.
        </p>
        <p>
          <strong className="text-white">Supabase</strong> — Datenbank und Speicherung hochgeladener Videos/Bilder.
        </p>
        <p>
          <strong className="text-white">Push-Dienste deines Browsers</strong> (z. B. FCM/Mozilla Push/APNs, je nach
          Browser/Gerät) — technisch notwendig, um Benachrichtigungen zuzustellen, sobald du sie aktivierst.
          </p>
          <p>
            <strong className="text-white">Expo (650 Industries, Inc.) und Apple Push Notification Service</strong> —
            Zustellung von Push-Benachrichtigungen in der App, sofern du sie erlaubst.
          </p>
          <p>
            <strong className="text-white">Resend</strong> — Versand von System-E-Mails (z. B. Passwort zurücksetzen).
          </p>
          <p>
            Einige dieser Anbieter haben ihren Sitz in den USA. Die Übermittlung erfolgt auf Grundlage des
            EU-US Data Privacy Framework bzw. der EU-Standardvertragsklauseln (Art. 45, 46 DSGVO).
          </p>
        <p>Mit allen Auftragsverarbeitern besteht bzw. wird ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO geschlossen.</p>
      </Section>

      <Section title="Speicherdauer">
        <p>
          Account- und Inhaltsdaten bleiben gespeichert, bis du dein Konto löschst — das geht jederzeit selbst in
            den Einstellungen (Web und App). Dabei werden Konto, Videos, Kommentare, Likes und Stimmen gelöscht; bist
            du das letzte Mitglied einer Marke, auch die Marke mit allen Inhalten. Nicht mehr verwendete hochgeladene
            Dateien werden automatisch täglich entfernt. IP-Adressen zur
          Missbrauchserkennung werden nur für das jeweilige Zeitfenster (aktuell bis zu 24 Stunden) vorgehalten.
        </p>
      </Section>

      <Section title="Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
          und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, dich bei einer Aufsichtsbehörde zu beschweren (in
          Österreich: die Datenschutzbehörde, dsb.gv.at). Wende dich dafür an markitch@outlook.de.
        </p>
      </Section>

      <Section title="Sicherheit">
        <p>
          Passwörter werden gehasht gespeichert, nie im Klartext. IP-basierte Ratenbegrenzung schützt vor
          automatisiertem Missbrauch (Fake-Accounts, manipuliertes Voting).
        </p>
      </Section>

      <p className="mt-8 text-xs text-zinc-600">
        Siehe auch{" "}
        <Link href="/impressum" className="text-orange-400 hover:underline">
          Impressum
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
