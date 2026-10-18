import Link from "next/link";
import { ConsentSettings } from "@/components/analytics/consent-banner";

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
// 2026-10-18.md. Jede Angabe entspricht dem, was der Code tatsächlich tut
// (Löschfristen: lib/retention.ts, Statistik: lib/analytics*.ts, Web-
// Einwilligung: components/analytics/consent-banner.tsx). Bei wesentlichen
// Änderungen TERMS_VERSION in lib/legal.ts und „Stand“ hier anpassen.
// Entwurf, kein Rechtsrat — vor dem öffentlichen Start anwaltlich prüfen.
export default function DatenschutzPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Datenschutzerklärung</h1>
      <p className="mb-6 text-xs text-zinc-600">Stand: 18. Oktober 2026 · gilt für die App MarkItch und www.markitch.com</p>

      <Section title="Verantwortlicher">
        <p>
          Austrana Solutions KG, Edi-Finger-Straße 7/6/602, 1210 Wien, Österreich (siehe{" "}
          <Link href="/impressum" className="text-orange-400 hover:underline">
            Impressum
          </Link>
          ). Für alle Datenschutzanliegen: <B>support@markitch.com</B>. Einen Datenschutzbeauftragten müssen wir nicht
          bestellen.
        </p>
      </Section>

      <Section title="Kurz zusammengefasst">
        <p>
          Wir verarbeiten nur, was MarkItch zum Funktionieren braucht. Keine Werbenetzwerke, kein Verkauf von Daten,
          kein Tracking über andere Apps oder Websites. Videos, Profile von Unternehmen und Creator, Kommentare und
          Reaktionen sind öffentlich. Wie du abstimmst, sieht niemand außer dir.
        </p>
      </Section>

      <Section title="1. Konto">
        <p>
          <B>Daten:</B> E-Mail-Adresse und Passwort (nur als Hash gespeichert, nie im Klartext) sind für das Konto
          nötig. Freiwillig: Anzeigename und Profilbild. Dazu die Kontoart (Zuschauer:in, Unternehmen/Marke oder
          Creator), ob deine E-Mail bestätigt ist und wann du den Nutzungsbedingungen zugestimmt hast.
        </p>
        <p>
          <B>Profile von Unternehmen und Creator</B> (Name, Logo bzw. Profilbild, Beschreibung, Kategorie, Land,
          Website/Link) sind öffentlich.
        </p>
        <p>
          <B>Zweck und Rechtsgrundlage:</B> Bereitstellung deines Kontos und von MarkItch (Vertrag, Art. 6 Abs. 1 lit. b
          DSGVO). Bestätigungslinks gelten 24 Stunden, Links zum Zurücksetzen des Passworts 1 Stunde. In der App wird
          dein Anmelde-Schlüssel nur verschlüsselt auf deinem Gerät gespeichert.
        </p>
      </Section>

      <Section title="2. Was andere von dir sehen">
        <p>
          Öffentlich sind: dein Anzeigename (ohne Namen steht dort „Nutzer:in“, nie ein Teil deiner E-Mail-Adresse),
          dein Profilbild, deine Kommentare, deine Reaktions-Videos und, wem du folgst bzw. wer dir folgt. Deine
          E-Mail-Adresse ist nie öffentlich.
        </p>
        <p>
          <B>Abstimmen bleibt privat:</B> Gespeichert wird, wie du in einem Duell abgestimmt hast, damit du nur einmal
          abstimmen kannst, dir das Ergebnis mitgeteilt wird und du in deinem Profil „Dein Geschmack“ siehst. Andere
          Nutzer:innen und die Unternehmen sehen nur Gesamtzahlen, nie, wer wie abgestimmt hat. „Dein Geschmack“ ist nur
          für dich sichtbar und hat keine Folgen.
        </p>
      </Section>

      <Section title="3. Inhalte und Interaktionen">
        <p>
          Videos, die du hochlädst (mit Beschreibung, Link und den Angaben zu Musikrechten, KI-Inhalten und bezahlter
          Kooperation), Kommentare, Likes, Stimmen, Reaktionen, wem du folgst, wen du blockierst, was du meldest und
          deine Benachrichtigungen. Videos werden beim Hochladen auf deinem Gerät verkleinert; wir erzeugen daraus
          Vorschaubilder.
        </p>
        <p>
          <B>Kamera, Mikrofon, Fotos (App):</B> nur wenn du selbst aufnimmst oder etwas auswählst, und nur nach deiner
          Freigabe in den iOS-Einstellungen.
        </p>
        <p>Rechtsgrundlage: Vertrag (Art. 6 Abs. 1 lit. b DSGVO).</p>
      </Section>

      <Section title="4. Moderation und Sicherheit">
        <p>
          <B>Automatische Prüfung:</B> Kommentare werden beim Absenden automatisch auf unzulässige Wörter, Links und
          wiederholte Inhalte geprüft; abgelehnte Kommentare werden nicht veröffentlicht und nicht gespeichert. Melden
          mindestens drei verschiedene, mindestens 7 Tage alte Konten ein Video, wird es bis zur Prüfung automatisch
          ausgeblendet. Über Löschungen und Sperren entscheidet immer ein Mensch.
        </p>
        <p>
          <B>Missbrauchsschutz:</B> Zur Abwehr von Fake-Konten und manipulierten Abstimmungen speichern wir bei
          Registrierung, Anmeldung und Abstimmung kurzzeitig die IP-Adresse bzw. eine Konto-Kennung
          (Ratenbegrenzung).
        </p>
        <p>
          Rechtsgrundlage: rechtliche Pflichten aus dem Digital Services Act (Art. 6 Abs. 1 lit. c DSGVO) und unser
          berechtigtes Interesse an einer sicheren, fairen Plattform (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
      </Section>

      <Section title="5. Benachrichtigungen">
        <p>
          Push-Benachrichtigungen (z. B. Ergebnis eines Duells, neue Einladung) schicken wir nur, wenn du sie erlaubst.
          Dafür speichern wir die Push-Kennung deines Geräts bzw. Browsers. Widerruf jederzeit in den
          iOS-Einstellungen bzw. im Browser. Rechtsgrundlage: deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
          System-E-Mails (Bestätigung, Passwort zurücksetzen) gehören zum Vertrag.
        </p>
      </Section>

      <Section title="6. Nutzungsstatistik">
        <p>
          Wir zählen, wie oft Videos angesehen, geteilt oder angeklickt werden und über welchen geteilten Link jemand
          kam. Dafür verwenden wir eine zufällige Kennung ohne Bezug zu deinem Konto:
        </p>
        <p>
          <B>In der App</B> existiert sie nur, solange die App geöffnet ist; auf deinem Gerät wird nichts gespeichert.
        </p>
        <p>
          <B>Im Web</B> nur für den aktuellen Seitenaufruf, es sei denn, du erlaubst im Banner die Statistik. Dann
          setzen wir ein Cookie (Laufzeit höchstens 400 Tage), mit dem wir zusätzlich wiederkehrende Besuche zählen.
          <ConsentSettings />
        </p>
        <p>
          Unternehmen und Creator sehen nur zusammengezählte Werte zu ihren eigenen Videos, nie, wer etwas angesehen
          hat. Rechtsgrundlage: berechtigtes Interesse an der Verbesserung von MarkItch und an Statistiken für
          Unternehmen (Art. 6 Abs. 1 lit. f DSGVO); für das Cookie im Web deine Einwilligung (§ 165 Abs. 3 TKG 2021,
          Art. 6 Abs. 1 lit. a DSGVO), jederzeit widerrufbar.
        </p>
        <p>
          <B>Fehlerprotokolle:</B> Tritt ein technischer Fehler auf, speichert unser Hoster kurzzeitig die aufgerufene
          Seite, den Fehlertext und den Browser-Typ, damit wir den Fehler beheben können (berechtigtes Interesse).
        </p>
      </Section>

      <Section title="7. Teilen auf Instagram">
        <p>
          Wenn du ein Video als Instagram-Story teilst, übergibt die App das Story-Bild und den Link an die
          Instagram-App von Meta Platforms Ireland Ltd. Das passiert nur, wenn du es auslöst; ab dann gilt die
          Datenschutzerklärung von Meta. Die dabei verwendete App-Kennung identifiziert nur MarkItch, nicht dich.
        </p>
      </Section>

      <Section title="8. Empfänger (Auftragsverarbeiter)">
        <p>
          <B>Vercel Inc.</B> (USA) — Hosting; die Anwendung läuft in Frankfurt.
        </p>
        <p>
          <B>Supabase Inc.</B> (USA) — Datenbank und Speicherung von Videos und Bildern, Rechenzentrum Frankfurt.
        </p>
        <p>
          <B>Resend Inc.</B> (USA) — Versand von System-E-Mails (Versand über Irland).
        </p>
        <p>
          <B>650 Industries Inc. („Expo“, USA) und Apple Push Notification Service</B> — Zustellung von
          Push-Benachrichtigungen in der App; im Web der Push-Dienst deines Browsers.
        </p>
        <p>
          Mit allen Auftragsverarbeitern besteht ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Übermittlungen
          in die USA stützen wir auf das EU-US Data Privacy Framework bzw. EU-Standardvertragsklauseln (Art. 45, 46
          DSGVO).
        </p>
      </Section>

      <Section title="9. Speicherdauer">
        <p>
          <B>Konto und Inhalte:</B> bis du sie bzw. dein Konto löschst (jederzeit selbst in den Einstellungen). Mit dem
          Konto werden Videos, Kommentare, Likes, Stimmen, Reaktionen, Benachrichtigungen und Push-Kennungen gelöscht;
          bist du das letzte Mitglied eines Unternehmens- oder Creator-Profils, auch dieses Profil mit allen Inhalten.
          Nicht mehr verwendete Dateien entfernen wir automatisch nach 48 Stunden. Sicherungskopien unseres
          Datenbank-Anbieters werden nach dessen Fristen überschrieben.
        </p>
        <p>
          <B>Missbrauchsschutz (IP-Adressen):</B> höchstens 7 Tage, danach automatisch gelöscht.
        </p>
        <p>
          <B>Statistik-Rohdaten:</B> 13 Monate, danach automatisch gelöscht.
        </p>
        <p>
          <B>Push-Kennung:</B> bis du dich abmeldest, Benachrichtigungen abschaltest oder die Kennung ungültig wird.
        </p>
        <p>
          <B>Meldungen und Moderationsentscheidungen:</B> bis zur Erledigung, danach höchstens 3 Jahre (Nachweis
          gegenüber Behörden und bei Streitfällen).
        </p>
      </Section>

      <Section title="10. Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch gegen Verarbeitungen aus berechtigtem Interesse (Art. 15–21 DSGVO).
          Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Schreib uns an
          support@markitch.com. Du kannst dich außerdem bei der Österreichischen Datenschutzbehörde beschweren
          (Barichgasse 40–42, 1030 Wien, dsb.gv.at).
        </p>
      </Section>

      <Section title="11. Alter">
        <p>
          MarkItch ist ab 16 Jahren. Erfahren wir, dass ein Konto einer jüngeren Person gehört, löschen wir es.
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
