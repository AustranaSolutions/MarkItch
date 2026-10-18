import "server-only";
import { and, isNotNull, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { brandAnalyticsEvents, rateLimitHits, reports, visitorEvents } from "@/db/schema";

// Luca 18.10.: Löschfristen, wie sie in der Datenschutzerklärung stehen —
// läuft im täglichen Nacht-Job (/api/cron/cleanup-uploads).
//  • IP-Adressen/Kennungen der Ratenbegrenzung: 7 Tage (längstes Zeitfenster
//    in lib/rate-limit.ts ist 7 Tage, älter wird nie gebraucht).
//  • Statistik-Rohdaten: 13 Monate.
//  • Erledigte Meldungen: 3 Jahre (Verjährungsfrist), offene bleiben bis zur Prüfung.
//  • Besucher-Statistik ohne Konto-Bezug: vorhandene Verknüpfungen werden
//    entfernt (neue Einträge speichern ohnehin keine userId mehr).
const DAY_MS = 24 * 60 * 60 * 1000;
export const RATE_LIMIT_RETENTION_DAYS = 7;
export const ANALYTICS_RETENTION_DAYS = 396; // 13 Monate
export const REPORT_RETENTION_DAYS = 3 * 365;

export type RetentionResult = {
  rateLimitHits: number;
  analyticsEvents: number;
  visitorEvents: number;
  unlinkedVisitorEvents: number;
  reports: number;
};

export async function applyRetention(): Promise<RetentionResult> {
  const now = Date.now();
  const rateCutoff = new Date(now - RATE_LIMIT_RETENTION_DAYS * DAY_MS);
  const statsCutoff = new Date(now - ANALYTICS_RETENTION_DAYS * DAY_MS);

  const rate = await db.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, rateCutoff)).returning({ id: rateLimitHits.id });
  const events = await db
    .delete(brandAnalyticsEvents)
    .where(lt(brandAnalyticsEvents.createdAt, statsCutoff))
    .returning({ id: brandAnalyticsEvents.id });
  const visits = await db.delete(visitorEvents).where(lt(visitorEvents.createdAt, statsCutoff)).returning({ id: visitorEvents.id });
  const oldReports = await db
    .delete(reports)
    .where(and(lt(reports.createdAt, new Date(now - REPORT_RETENTION_DAYS * DAY_MS)), ne(reports.status, "open")))
    .returning({ id: reports.id });
  const unlinked = await db
    .update(visitorEvents)
    .set({ userId: null })
    .where(isNotNull(visitorEvents.userId))
    .returning({ id: visitorEvents.id });

  return {
    rateLimitHits: rate.length,
    analyticsEvents: events.length,
    visitorEvents: visits.length,
    unlinkedVisitorEvents: unlinked.length,
    reports: oldReports.length,
  };
}
