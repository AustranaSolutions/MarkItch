import "server-only";
import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { errorEvents } from "@/db/schema";
import { sendAdminAlertEmail } from "@/lib/email";

// Luca 25.10.: Fehler-Alarm ohne externen Dienst. Server-Fehler (instrumentation.ts),
// Website-Fehler und App-Fehler (/api/client-error) landen hier: gleiche Fehler werden
// in error_events zusammengezählt, an ADMIN_EMAILS geht höchstens eine Mail pro Stunde
// und Fehler. Fällt die Datenbank selbst aus, geht die Mail trotzdem raus (gedrosselt
// pro Server-Instanz im Speicher) — gerade dann soll man es erfahren.

export type ErrorSource = "server" | "web" | "app";

const MAIL_EVERY_MS = 60 * 60 * 1000;
/** Obergrenze für alle Fehler zusammen — /api/client-error ist offen, niemand soll damit Mails fluten. */
const MAX_MAILS_PER_HOUR = 10;
const memoryMailed = new Map<string, number>();

/** Zahlen, IDs und Adressen raus, damit derselbe Fehler mit anderen Werten zusammenfällt. */
function normalize(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\d+/g, "<n>")
    .slice(0, 200);
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

async function mail(source: ErrorSource, message: string, detail: string | null, count: number) {
  const to = adminEmails();
  if (to.length === 0) return;
  const where = { server: "Server", web: "Website", app: "App" }[source];
  await Promise.all(to.map((address) => sendAdminAlertEmail(address, `⚠️ MarkItch-Fehler (${where}): ${message.slice(0, 80)}`, message, detail, count)));
}

/** Wirft nie. `detail` = Stack, Pfad, Gerät … (gekürzt gespeichert). */
export async function reportError(source: ErrorSource, rawMessage: string, rawDetail?: string | null): Promise<void> {
  try {
    const message = rawMessage.replace(/\s+/g, " ").trim().slice(0, 500) || "Unbekannter Fehler";
    const detail = rawDetail ? rawDetail.slice(0, 4000) : null;
    const signature = createHash("sha256").update(`${source}|${normalize(message)}`).digest("hex").slice(0, 32);
    const now = new Date();

    let shouldMail = false;
    let count = 1;
    try {
      const [row] = await db
        .insert(errorEvents)
        .values({ signature, source, message, detail })
        .onConflictDoUpdate({
          target: errorEvents.signature,
          set: { count: sql`${errorEvents.count} + 1`, lastSeenAt: now, message, detail },
        })
        .returning({ count: errorEvents.count, lastMailedAt: errorEvents.lastMailedAt });
      count = row.count;
      if (!row.lastMailedAt || now.getTime() - row.lastMailedAt.getTime() > MAIL_EVERY_MS) {
        const hourAgo = new Date(now.getTime() - MAIL_EVERY_MS);
        // Nur die Anfrage, die das Feld wirklich umstellt, schickt die Mail (keine doppelten bei gleichzeitigen Fehlern).
        const claimed = await db.execute(
          sql`update error_events set last_mailed_at = ${now} where signature = ${signature} and (last_mailed_at is null or last_mailed_at < ${hourAgo}) and (select count(*) from error_events where last_mailed_at >= ${hourAgo}) < ${MAX_MAILS_PER_HOUR}`,
        );
        shouldMail = (claimed.rowCount ?? 0) > 0;
      }
    } catch (dbError) {
      // Datenbank nicht erreichbar → im Speicher drosseln und trotzdem melden.
      const last = memoryMailed.get(signature) ?? 0;
      shouldMail = now.getTime() - last > MAIL_EVERY_MS;
      if (shouldMail) memoryMailed.set(signature, now.getTime());
      console.error("[error-alerts] Speichern fehlgeschlagen:", dbError instanceof Error ? dbError.message : dbError);
    }
    if (shouldMail) await mail(source, message, detail, count);
  } catch (err) {
    console.error("[error-alerts] Melden fehlgeschlagen:", err instanceof Error ? err.message : err);
  }
}
