import type { Lang } from "@/lib/i18n";

// Luca 12.11.: Meldungen von Server und Actions sind deutsch geschrieben. Statt
// jede Stelle umzubauen, übersetzt diese Tabelle sie an der Ausgabe (API-Antwort,
// Action-Ergebnis) ins Englische. Unbekannte Texte bleiben unverändert.
// Neue Meldung → hier ergänzen.

const EXACT: Record<string, string> = {
  "Abstimmen ist erst möglich, wenn beide Videos da sind.": "Voting opens once both videos are in.",
  "Account nicht gefunden.": "Account not found.",
  "Account wurde erstellt, aber der automatische Login ist fehlgeschlagen. Bitte melde dich manuell an.":
    "Your account was created, but automatic login failed. Please log in manually.",
  "Aktuelles Passwort fehlt.": "Current password is missing.",
  "Aktuelles Passwort ist falsch.": "Current password is incorrect.",
  "Auf diese Einladung wurde bereits reagiert.": "This invite has already been answered.",
  "Aus dieser Reaktion ist schon ein Duell geworden — sie lässt sich nicht mehr löschen.":
    "This reaction has already become a duel — it can no longer be deleted.",
  "Bei deiner eigenen Challenge kannst du nicht mitmachen.": "You can’t join your own challenge.",
  "Beschreibe kurz, was die Creator zeigen sollen.": "Briefly describe what creators should show.",
  "Bitte Kategorie wählen.": "Please choose a category.",
  "Bitte Land wählen.": "Please choose a country.",
  "Bitte Standort-Art wählen.": "Please choose a location type.",
  "Bitte beschreibe kurz, wen du suchst.": "Please briefly describe who you’re looking for.",
  "Bitte bestätige, dass deine Marke keine gesperrten Produkte bewirbt.":
    "Please confirm that your brand doesn’t promote prohibited products.",
  "Bitte bestätige, dass du den Ton verwenden darfst.": "Please confirm that you’re allowed to use the audio.",
  "Bitte dein Einsatzgebiet angeben.": "Please enter your service area.",
  "Bitte den Ort angeben (z. B. Graz-Eggenberg).": "Please enter the location (e.g. Graz-Eggenberg).",
  "Bitte ein Video auswählen.": "Please choose a video.",
  "Bitte eine Beschriftung angeben.": "Please enter a button text.",
  "Bitte eine Einreichfrist wählen.": "Please choose a submission deadline.",
  "Bitte eine Frist von 3, 7, 14 oder 30 Tagen wählen.": "Please choose a deadline of 3, 7, 14 or 30 days.",
  "Bitte eine Kategorie wählen.": "Please choose a category.",
  "Bitte eine gültige E-Mail-Adresse eingeben.": "Please enter a valid email address.",
  "Bitte eine gültige Telefonnummer eingeben.": "Please enter a valid phone number.",
  "Bitte eine gültige Website eingeben.": "Please enter a valid website.",
  "Bitte eine kurze Beschreibung schreiben.": "Please write a short description.",
  "Bitte einen Button wählen.": "Please choose a button.",
  "Bitte einen Link angeben.": "Please enter a link.",
  "Bitte einen Monat wählen.": "Please choose a month.",
  "Bitte einen gültigen Link eingeben (z. B. meinsalon.at/termin).": "Please enter a valid link (e.g. mysalon.com/booking).",
  "Bitte gib deinen Namen an (mind. 2 Zeichen).": "Please enter your name (at least 2 characters).",
  "Bitte melde dich an.": "Please log in.",
  "Bitte wähle Acro oder Assent.": "Please choose Acro or Assent.",
  "Bitte wähle einen Grund.": "Please choose a reason.",
  "Bitte wählen, wo man dich findet.": "Please choose where people can find you.",
  "Boost ist aktuell nicht verfügbar.": "Boost isn’t available right now.",
  "Das Video wurde nicht gefunden — bitte nochmal hochladen.": "The video wasn’t found — please upload it again.",
  "Das ist nicht dein Pitch.": "That’s not your pitch.",
  "Das ist nicht dein Video.": "That’s not your video.",
  "Das ist nicht deine Reaktion.": "That’s not your reaction.",
  "Deine Meinung darf nicht leer sein.": "Your comment can’t be empty.",
  "Deine Meinung enthält Wörter, die hier nicht erlaubt sind. Bitte bleib respektvoll.":
    "Your comment contains words that aren’t allowed here. Please stay respectful.",
  "Der Ausschnitt muss mindestens 1 Sekunde lang sein.": "The clip must be at least 1 second long.",
  "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.": "The link is invalid or has expired. Please request a new one.",
  "Der zugehörige Pitch existiert nicht mehr.": "The related pitch no longer exists.",
  "Die Abstimmung für dieses Casting ist beendet.": "Voting for this casting has ended.",
  "Die Datei ist kein gültiges Video.": "The file isn’t a valid video.",
  "Die Einreichungsfrist ist abgelaufen.": "The submission deadline has passed.",
  "Die Frist für diesen Pitch ist abgelaufen.": "The deadline for this pitch has passed.",
  "Diese Challenge gibt es nicht.": "This challenge doesn’t exist.",
  "Diese Challenge ist beendet.": "This challenge has ended.",
  "Diese Einladung existiert nicht für deine Marke.": "This invite doesn’t exist for your brand.",
  "Diese Einladung ist abgelaufen — das Zeitfenster ist vorbei.": "This invite has expired — the time window is over.",
  "Diese Einladung ist nicht mehr offen.": "This invite is no longer open.",
  "Diese Marke existiert nicht.": "This brand doesn’t exist.",
  "Diese Marke gibt es nicht.": "This brand doesn’t exist.",
  "Diese Marke kannst du nicht blockieren.": "You can’t block this brand.",
  "Diese Meinung gibt es nicht mehr.": "This comment no longer exists.",
  "Diese Meinung hast du gerade schon geschrieben.": "You just posted this comment.",
  "Diese Reaktion existiert nicht mehr.": "This reaction no longer exists.",
  "Diese Reaktion existiert nicht.": "This reaction doesn’t exist.",
  "Diese Reaktion ist bereits ein offizielles Duell.": "This reaction is already an official duel.",
  "Diese Runde ist beendet — abstimmen geht nur in der laufenden Runde.": "This round has ended — you can only vote in the current round.",
  "Diesen Markennamen gibt es schon. Wenn das deine Marke ist, melde dich bei uns.":
    "This brand name already exists. If it’s your brand, please contact us.",
  "Diesen Profilnamen gibt es schon. Wenn das du bist, melde dich bei uns.":
    "This profile name already exists. If it’s you, please contact us.",
  "Diesen Titel gibt es nicht.": "This track doesn’t exist.",
  "Dieser Pitch existiert nicht.": "This pitch doesn’t exist.",
  "Dieses Casting existiert nicht.": "This casting doesn’t exist.",
  "Dieses Casting gibt es nicht.": "This casting doesn’t exist.",
  "Dieses Duell gibt es nicht.": "This duel doesn’t exist.",
  "Dieses Konto gibt es nicht.": "This account doesn’t exist.",
  "Dieses Video existiert nicht.": "This video doesn’t exist.",
  "Du brauchst eine Marke, um einen Boost anzufragen.": "You need a brand to request a boost.",
  "Du darfst diese Meinung nicht löschen.": "You’re not allowed to delete this comment.",
  "Du hast bei dieser Challenge schon ein Video eingereicht.": "You’ve already submitted a video to this challenge.",
  "Du hast bereits abgestimmt.": "You’ve already voted.",
  "Du hast bereits ein laufendes Casting.": "You already have a casting running.",
  "Du hast bereits eine Marke erstellt.": "You’ve already created a brand.",
  "Du hast für diesen Pitch bereits ein Video hochgeladen.": "You’ve already uploaded a video for this pitch.",
  "Du hast für dieses Casting bereits eingereicht.": "You’ve already submitted to this casting.",
  "Du hast in dieser Runde bereits abgestimmt.": "You’ve already voted in this round.",
  "Du hast keine Marke.": "You don’t have a brand.",
  "Du hast noch kein Profil angelegt.": "You haven’t created a profile yet.",
  "Du kannst bei Videos über deine eigene Marke nicht mitstimmen.": "You can’t vote on videos about your own brand.",
  "Du kannst bei diesem Casting nicht mitstimmen.": "You can’t vote in this casting.",
  "Du kannst deine eigene Marke nicht einladen.": "You can’t invite your own brand.",
  "Du kannst deinen eigenen Pitch nicht herausfordern.": "You can’t challenge your own pitch.",
  "Du kannst dich nicht selbst blockieren.": "You can’t block yourself.",
  "Du kannst kein Video für deine eigene Marke posten.": "You can’t post a video for your own brand.",
  "Du kannst nicht auf deine eigene Reaktion antworten.": "You can’t reply to your own reaction.",
  "Du kannst nicht auf deinen eigenen Pitch reagieren.": "You can’t react to your own pitch.",
  "Du kannst nicht bei deinem eigenen Casting mitmachen.": "You can’t join your own casting.",
  "Du kannst nicht bei einem Pitch deiner eigenen Marke abstimmen.": "You can’t vote on a pitch by your own brand.",
  "Du kannst nicht mitstimmen, wenn du selbst in dieser Runde mitmachst.": "You can’t vote if you’re taking part in this round yourself.",
  "Du musst zuerst eine Marke erstellen, um einen Pitch zu schicken.": "You need to create a brand first to send a pitch.",
  "Du musst zuerst eine Marke erstellen, um einzuladen.": "You need to create a brand first to send invites.",
  "Du musst zuerst eine Marke erstellen, um mitzumachen.": "You need to create a brand first to join.",
  "Du musst zuerst eine Marke erstellen, um zu reagieren.": "You need to create a brand first to react.",
  "Du musst zuerst eine Marke erstellen.": "You need to create a brand first.",
  "Duell nicht gefunden.": "Duel not found.",
  "E-Mail oder Passwort ist falsch.": "Email or password is incorrect.",
  "Ein leerer Entwurf wird nicht gespeichert.": "An empty draft won’t be saved.",
  "Erlaubt: JPEG, PNG oder WEBP.": "Allowed: JPEG, PNG or WEBP.",
  "Erlaubt: MP4, WEBM oder MOV.": "Allowed: MP4, WEBM or MOV.",
  "Erlaubt: PNG, JPEG, WEBP oder SVG.": "Allowed: PNG, JPEG, WEBP or SVG.",
  "Für diese E-Mail-Adresse existiert bereits ein Account.": "An account with this email address already exists.",
  "Für diesen Pitch läuft schon eine Boost-Anfrage oder ein aktiver Boost.": "This pitch already has a boost request or an active boost.",
  "Hat nicht geklappt — bitte nochmal versuchen.": "That didn’t work — please try again.",
  "Hat nicht geklappt.": "That didn’t work.",
  "Hochstufen fehlgeschlagen.": "Couldn’t turn it into a duel.",
  "Leg zuerst dein Marken- bzw. Creator-Profil an, um mitzumachen.": "Create your brand or creator profile first to join.",
  "Links sind in Meinungen nicht erlaubt.": "Links aren’t allowed in comments.",
  "Maximal 500 Zeichen.": "Maximum 500 characters.",
  "Maximal 80 Zeichen.": "Maximum 80 characters.",
  "Mindestens 2 Zeichen.": "At least 2 characters.",
  "Mindestens 8 Zeichen.": "At least 8 characters.",
  "Mindestens ein Buchstabe.": "At least one letter.",
  "Mindestens eine Zahl.": "At least one number.",
  "Mit dieser Marke bzw. diesem Creator läuft bereits eine offene Einladung.": "There’s already an open invite with this brand or creator.",
  "Nicht erlaubt.": "Not allowed.",
  "Nicht gefunden.": "Not found.",
  "Nicht mehr verfügbar.": "No longer available.",
  "Nur Acro-Accounts können eine Marke erstellen.": "Only Acro accounts can create a brand.",
  "Nur die Marke selbst kann ihr Casting löschen.": "Only the brand itself can delete its casting.",
  "Nur die Marke selbst kann ihre Challenge löschen.": "Only the brand itself can delete its challenge.",
  "Nur die Original-Marke kann eine Reaktion hochstufen.": "Only the original brand can turn a reaction into a duel.",
  "Nur die Reaktion einer Marke kann ein Duell werden.": "Only a brand’s reaction can become a duel.",
  "Nur eine Reaktion auf einen Pitch kann ein Duell werden.": "Only a reaction to a pitch can become a duel.",
  "Nur eine direkte Reaktion auf den Pitch kann hochgestuft werden.": "Only a direct reaction to the pitch can become a duel.",
  "Nur für Admins.": "Admins only.",
  "Nur für Marken-Konten.": "Brand accounts only.",
  "Passwort fehlt.": "Password is missing.",
  "Passwort ist falsch.": "Password is incorrect.",
  "Speichern fehlgeschlagen.": "Saving failed.",
  "Ungültige Anfrage.": "Invalid request.",
  "Ungültige Dateigröße.": "Invalid file size.",
  "Ungültige E-Mail-Adresse.": "Invalid email address.",
  "Ungültige Eingabe.": "Invalid input.",
  "Ungültige Einreichung.": "Invalid submission.",
  "Ungültige Marke für diesen Pitch.": "Invalid brand for this pitch.",
  "Ungültige Push-Kennung.": "Invalid push token.",
  "Ungültige URL (z. B. https://example.com).": "Invalid URL (e.g. https://example.com).",
  "Ungültige Video-URL.": "Invalid video URL.",
  "Ungültiger Link (z. B. https://example.com).": "Invalid link (e.g. https://example.com).",
  "Upload konnte nicht vorbereitet werden.": "The upload couldn’t be prepared.",
  "Video fehlt.": "Video is missing.",
  "Zu viele Versuche — bitte warte etwas und versuch es dann erneut.": "Too many attempts — please wait a bit and try again.",
  "Zwischen diesen beiden Marken läuft bereits ein Duell.": "These two brands already have a duel running.",
};

/** Meldungen mit Platzhaltern (Namen, Zahlen). */
const PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [/^Maximal (\d+) Zeichen\.$/, (n) => `Maximum ${n} characters.`],
  [/^Mindestens (\d+) Zeichen\.$/, (n) => `At least ${n} characters.`],
];

export function translateMessage(message: string, lang: Lang): string {
  if (lang === "de") return message;
  const exact = EXACT[message];
  if (exact) return exact;
  for (const [rx, fn] of PATTERNS) {
    const m = message.match(rx);
    if (m) return fn(...m.slice(1));
  }
  return message;
}

/** Für JSON-Antworten { error, fieldErrors } — übersetzt beide. */
export function translateErrorBody<T extends { error?: unknown; fieldErrors?: unknown }>(body: T, lang: Lang): T {
  if (lang === "de") return body;
  const out: Record<string, unknown> = { ...body };
  if (typeof body.error === "string") out.error = translateMessage(body.error, lang);
  if (body.fieldErrors && typeof body.fieldErrors === "object") {
    out.fieldErrors = Object.fromEntries(
      Object.entries(body.fieldErrors as Record<string, unknown>).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.map((x) => (typeof x === "string" ? translateMessage(x, lang) : x)) : v,
      ]),
    );
  }
  return out as T;
}
