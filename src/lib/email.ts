import { Resend } from "resend";
import { requestLang } from "@/lib/lang";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Until a custom domain is verified in Resend, this default sender only
// works when sending to the Resend account's own owner email. See the
// deployment notes for how to lift that restriction.
const FROM = process.env.EMAIL_FROM ?? "MarkItch <onboarding@resend.dev>";

const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "MarkItch Support <support@markitch.com>";

export function wrapHtml(body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#18181b;background:#ffffff">
${body}
<p style="margin-top:32px;font-size:12px;color:#71717a">MarkItch · Austrana Solutions KG · <a href="https://www.markitch.com/impressum" style="color:#71717a">Impressum</a></p>
</body></html>`;
}

/** Textfassung für Mail-Programme/Spamfilter: Links als „Text: URL“, Tags raus. */
export function htmlToText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, href: string, label: string) =>
      label.replace(/<[^>]+>/g, "").trim() === href ? href : `${label.replace(/<[^>]+>/g, "").trim()}: ${href}`,
    )
    .replace(/<hr\s*\/?>/gi, "\n----\n")
    .replace(/<\/(p|pre|div)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function button(href: string, label: string, en = false): string {
  return `<p><a href="${href}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:999px">${label}</a></p>
     <p style="font-size:13px;color:#71717a">${en ? "If the button doesn’t work, copy this link:" : "Falls der Knopf nicht geht, kopiere diesen Link:"}<br>${href}</p>`;
}

async function sendEmail(to: string, subject: string, html: string, linkForLogs: string) {
  // Lokal den Link ausgeben (ohne Mail-Versand der einzige Weg, ihn zu
  // bekommen). In Produktion nie (Audit 04.10., H2): ein Reset-Link im Log ist
  // ein Zugang zum Konto — dort nur ein Vermerk ohne Link und ohne Adresse.
  if (process.env.NODE_ENV === "production") {
    console.log(`[email] subject="${subject}" (Link nicht protokolliert)`);
  } else {
    console.log(`[email] to=${to} subject="${subject}" link=${linkForLogs}`);
  }

  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — email not actually sent.");
    return;
  }

  // Luca 16.11.: Mails landeten bei Outlook im Junk. Reine HTML-Mails ohne
  // Textfassung, ohne Antwortadresse und mit nackten Links als Linktext werten
  // Spamfilter ab — deshalb vollständiges HTML-Dokument + Textfassung + Antwort an
  // den Support. Der Rest (SPF/DKIM/DMARC, Ruf der neuen Domain) liegt im DNS.
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: wrapHtml(html),
    text: htmlToText(html),
    replyTo: REPLY_TO,
  });
  if (error) {
    // Don't throw: the user can still copy the link from the server logs
    // while email delivery is being set up (e.g. resend.dev's
    // own-address-only restriction before a domain is verified).
    console.error("[email] Resend send failed:", error);
  }
}

// Luca 12.11.: System-Mails in der Sprache der Anfrage (Website: Umschalter/Browser, App: Handysprache).
export async function sendVerificationEmail(to: string, verifyUrl: string) {
  if ((await requestLang()) === "en") {
    await sendEmail(
      to,
      "Confirm your email address — MarkItch",
      `<p>Welcome to MarkItch!</p>
     <p>Please confirm your email address to activate your account:</p>
     ${button(verifyUrl, "Confirm email", true)}
     <p>The link is valid for 24 hours.</p>`,
      verifyUrl,
    );
    return;
  }
  await sendEmail(
    to,
    "Bestätige deine E-Mail-Adresse — MarkItch",
    `<p>Willkommen bei MarkItch!</p>
     <p>Bitte bestätige deine E-Mail-Adresse, um deinen Account zu aktivieren:</p>
     ${button(verifyUrl, "E-Mail bestätigen")}
     <p>Der Link ist 24 Stunden gültig.</p>`,
    verifyUrl,
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if ((await requestLang()) === "en") {
    await sendEmail(
      to,
      "Reset your password — MarkItch",
      `<p>You asked to reset your password.</p>
     ${button(resetUrl, "Set new password", true)}
     <p>The link is valid for 1 hour. If this wasn’t you, you can ignore this email.</p>`,
      resetUrl,
    );
    return;
  }
  await sendEmail(
    to,
    "Passwort zurücksetzen — MarkItch",
    `<p>Du hast angefordert, dein Passwort zurückzusetzen.</p>
     ${button(resetUrl, "Neues Passwort festlegen")}
     <p>Der Link ist 1 Stunde gültig. Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>`,
    resetUrl,
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Luca 18.10. (Art. 17 DSA): Begründung bei Entfernung oder Sperre — schlichter Text, ohne Links.
 * Luca 12.11.: zweisprachig (erst Deutsch, dann Englisch) — ausgelöst von der Moderation, die Sprache der Person ist dort unbekannt.
 */
export async function sendModerationEmail(to: string, subject: string, paragraphs: string[], english?: { subject: string; paragraphs: string[] }) {
  const html = (ps: string[]) => ps.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
  await sendEmail(
    to,
    english ? `${subject} / ${english.subject}` : subject,
    english ? `${html(paragraphs)}\n<hr>\n${html(english.paragraphs)}` : html(paragraphs),
    "(Moderation, kein Link)",
  );
}

/** Luca 25.10.: Fehler-Alarm (lib/error-alerts.ts) — an die Adressen in ADMIN_EMAILS. */
export async function sendAdminAlertEmail(to: string, subject: string, message: string, detail: string | null, count: number) {
  const base = process.env.APP_URL ?? "https://www.markitch.com";
  await sendEmail(
    to,
    subject,
    `<p><strong>${escapeHtml(message)}</strong></p>
     <p>Bisher ${count}× aufgetreten. Weitere Mails zu diesem Fehler höchstens einmal pro Stunde.</p>
     ${detail ? `<pre style="white-space:pre-wrap;font-size:12px;background:#f4f4f5;padding:8px">${escapeHtml(detail)}</pre>` : ""}
     <p><a href="${base}/admin/errors">Alle Fehler ansehen</a></p>`,
    "(Fehler-Alarm, kein Link)",
  );
}
