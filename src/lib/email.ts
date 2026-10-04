import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Until a custom domain is verified in Resend, this default sender only
// works when sending to the Resend account's own owner email. See the
// deployment notes for how to lift that restriction.
const FROM = process.env.EMAIL_FROM ?? "MarkItch <onboarding@resend.dev>";

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

  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    // Don't throw: the user can still copy the link from the server logs
    // while email delivery is being set up (e.g. resend.dev's
    // own-address-only restriction before a domain is verified).
    console.error("[email] Resend send failed:", error);
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await sendEmail(
    to,
    "Bestätige deine E-Mail-Adresse — MarkItch",
    `<p>Willkommen bei MarkItch!</p>
     <p>Bitte bestätige deine E-Mail-Adresse, um deinen Account zu aktivieren:</p>
     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
     <p>Der Link ist 24 Stunden gültig.</p>`,
    verifyUrl,
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail(
    to,
    "Passwort zurücksetzen — MarkItch",
    `<p>Du hast angefordert, dein Passwort zurückzusetzen.</p>
     <p><a href="${resetUrl}">${resetUrl}</a></p>
     <p>Der Link ist 1 Stunde gültig. Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>`,
    resetUrl,
  );
}
