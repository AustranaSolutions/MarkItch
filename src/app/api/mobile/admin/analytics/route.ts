import { NextResponse } from "next/server";
import {
  getActiveBrandsStats,
  getCtaStats,
  getReferralStats,
  getRetention,
  getVideosPerSessionStats,
  getVisitorStats,
  getVoteFunnel,
} from "@/lib/platform-analytics";
import { requireMobileAdmin } from "@/lib/mobile-admin";

// Luca 11.10.: Plattform-Zahlen in der App — dieselben wie /admin/analytics.
/**
 * Luca 18.10.: live hing die Auswertung (App brach nach 15 s ab). Jeder Teil
 * bekommt höchstens 8 s; ein hängender Teil liefert leere Werte, statt die
 * ganze Seite zu blockieren, und landet mit Namen im Vercel-Log.
 */
const SECTION_TIMEOUT_MS = 8000;

async function withTimeout<T>(label: string, task: () => Promise<T>, fallback: T): Promise<T> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task().then((value) => {
        console.log(`[admin/analytics] ${label}: ${Date.now() - started} ms`);
        return value;
      }),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          console.error(`[admin/analytics] ${label}: Zeitlimit ${SECTION_TIMEOUT_MS} ms überschritten`);
          resolve(fallback);
        }, SECTION_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    console.error(`[admin/analytics] ${label}: Fehler nach ${Date.now() - started} ms`, err);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const [visitors, videosPerSession, retention, cta, voteFunnel, referrals, brands] = await Promise.all([
    withTimeout("visitors", () => getVisitorStats(30), { uniqueVisitors: 0, sessionStarts: 0, dailyUniqueVisitors: [] }),
    withTimeout("videosPerSession", () => getVideosPerSessionStats(14), {
      sessionsWithViews: 0,
      avgVideosPerSession: 0,
      pctReaching3: 0,
      pctReaching5: 0,
      pctReaching10: 0,
    }),
    withTimeout("retention", () => getRetention(), { d1: null, d7: null, d30: null, activeDaysObserved: 0 }),
    withTimeout("cta", () => getCtaStats(30), { views: 0, clicks: 0, ctr: null }),
    withTimeout("voteFunnel", () => getVoteFunnel(30), {
      contentOpened: 0,
      voteClicked: 0,
      loginRequired: 0,
      registerStarted: 0,
      registerCompleted: 0,
      voteCompleted: 0,
    }),
    withTimeout("referrals", () => getReferralStats(30), { totalSessions: 0, withRef: 0, topRefs: [] }),
    withTimeout("brands", () => getActiveBrandsStats(), { totalBrands: 0, activeLast30d: 0, postedMoreThanOnce: 0 }),
  ]);
  return NextResponse.json({ visitors, videosPerSession, retention, cta, voteFunnel, referrals, brands });
}
