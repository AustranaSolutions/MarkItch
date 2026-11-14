import "server-only";
import { and, count, countDistinct, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { brandAnalyticsEvents, brandMembers, visitorEvents, battles, brands, comments, follows, likes, reactions, savedCodes, soloPitches, users, votes } from "@/db/schema";

// Phase 47: interne Metriken für /admin/analytics — deckt BETA-2-F/G aus
// MarkItch_Launch_Minimum_Claude_Code_Prompt.md ab ("Produkt-/Funnel-
// Analytics", "Vote-Funnel"). Ursprünglich alles in JS aggregiert statt mit
// SQL-Datums-Funktionen — bei Beta-Datenmengen (niedrige Tausenderstellen)
// unproblematisch, und deutlich einfacher lesbar/wartbar als
// dialektspezifisches SQL. "Kein überdimensioniertes Data-Warehouse" (siehe
// Launch-Plan §3.F) — wenn das Datenvolumen das mal sprengt, ist das ein
// gutes Problem.

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export type VisitorStats = {
  uniqueVisitors: number;
  sessionStarts: number;
  dailyUniqueVisitors: { day: string; count: number }[];
};

/** "Sessions/Besucher" — eindeutige anonId mit mindestens einem session_start im Zeitraum. */
export async function getVisitorStats(days = 30): Promise<VisitorStats> {
  const rows = await db
    .select({ anonId: visitorEvents.anonId, createdAt: visitorEvents.createdAt })
    .from(visitorEvents)
    .where(and(eq(visitorEvents.kind, "session_start"), gte(visitorEvents.createdAt, daysAgo(days))));

  const byDay = new Map<string, Set<string>>();
  const allVisitors = new Set<string>();
  for (const r of rows) {
    allVisitors.add(r.anonId);
    const key = dayKey(r.createdAt);
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key)!.add(r.anonId);
  }

  const dailyUniqueVisitors = [...byDay.entries()]
    .map(([day, set]) => ({ day, count: set.size }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  return { uniqueVisitors: allVisitors.size, sessionStarts: rows.length, dailyUniqueVisitors };
}

export type VideosPerSessionStats = {
  sessionsWithViews: number;
  avgVideosPerSession: number;
  pctReaching3: number;
  pctReaching5: number;
  pctReaching10: number;
};

/** "Videos pro Session" / "3/5/10 Videos angesehen" — (anonId, Kalendertag) als Session-Näherung, siehe SessionBoot. */
export async function getVideosPerSessionStats(days = 14): Promise<VideosPerSessionStats> {
  // Luca 18.10.: in der Datenbank zählen statt jede Zeile zu laden (live > 8 s).
  const day = sql<string>`to_char(${brandAnalyticsEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const rows = await db
    .select({ n: count() })
    .from(brandAnalyticsEvents)
    .where(
      and(eq(brandAnalyticsEvents.kind, "view"), isNotNull(brandAnalyticsEvents.anonId), gte(brandAnalyticsEvents.createdAt, daysAgo(days))),
    )
    .groupBy(brandAnalyticsEvents.anonId, day);

  const counts = rows.map((r) => Number(r.n));
  const sessionsWithViews = counts.length;
  if (sessionsWithViews === 0) {
    return { sessionsWithViews: 0, avgVideosPerSession: 0, pctReaching3: 0, pctReaching5: 0, pctReaching10: 0 };
  }
  const total = counts.reduce((sum, n) => sum + n, 0);
  const pct = (threshold: number) => (counts.filter((n) => n >= threshold).length / sessionsWithViews) * 100;

  return {
    sessionsWithViews,
    avgVideosPerSession: total / sessionsWithViews,
    pctReaching3: pct(3),
    pctReaching5: pct(5),
    pctReaching10: pct(10),
  };
}

export type RetentionStats = {
  /** Null, solange nicht genug Tage/Aktivität vorliegen, um die Kennzahl sinnvoll zu bilden. */
  d1: number | null;
  d7: number | null;
  d30: number | null;
  activeDaysObserved: number;
};

/**
 * D1/D7/D30-Retention als "rolling retention": von allen anonId, die vor N
 * Tagen aktiv waren, wie viel Prozent waren auch am Beobachtungstag selbst
 * aktiv — gemittelt über die Tage im Fenster. "Aktiv" = session_start ODER
 * ein getaggter view (siehe getVideosPerSessionStats). Bewusst kein
 * vollständiges Kohorten-Modell — für eine frühe Beta reicht dieser
 * einfachere, robuste Näherungswert (siehe Datei-Kommentar oben).
 */
export async function getRetention(): Promise<RetentionStats> {
  const since = daysAgo(45);
  // Luca 18.10.: nur eindeutige (Kennung, Tag)-Paare aus der Datenbank holen statt aller Zeilen.
  const sessionDay = sql<string>`to_char(${visitorEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const viewDay = sql<string>`to_char(${brandAnalyticsEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const [sessionRows, viewRows] = await Promise.all([
    db
      .selectDistinct({ anonId: visitorEvents.anonId, day: sessionDay })
      .from(visitorEvents)
      .where(and(eq(visitorEvents.kind, "session_start"), gte(visitorEvents.createdAt, since))),
    db
      .selectDistinct({ anonId: brandAnalyticsEvents.anonId, day: viewDay })
      .from(brandAnalyticsEvents)
      .where(and(eq(brandAnalyticsEvents.kind, "view"), isNotNull(brandAnalyticsEvents.anonId), gte(brandAnalyticsEvents.createdAt, since))),
  ]);

  const activeByDay = new Map<string, Set<string>>();
  const addActive = (anonId: string | null, day: string) => {
    if (!anonId) return;
    if (!activeByDay.has(day)) activeByDay.set(day, new Set());
    activeByDay.get(day)!.add(anonId);
  };
  for (const r of sessionRows) addActive(r.anonId, r.day);
  for (const r of viewRows) addActive(r.anonId, r.day);

  const days = [...activeByDay.keys()].sort();

  function rollingRetention(offset: number): number | null {
    let retained = 0;
    let baseline = 0;
    for (const day of days) {
      const base = activeByDay.get(day);
      if (!base || base.size === 0) continue;
      const laterDate = new Date(`${day}T00:00:00.000Z`);
      laterDate.setUTCDate(laterDate.getUTCDate() + offset);
      const later = activeByDay.get(dayKey(laterDate));
      if (!later) continue; // dieser Vergleichstag liegt (noch) außerhalb der beobachteten Daten
      baseline += base.size;
      for (const anonId of base) if (later.has(anonId)) retained += 1;
    }
    return baseline > 0 ? (retained / baseline) * 100 : null;
  }

  return { d1: rollingRetention(1), d7: rollingRetention(7), d30: rollingRetention(30), activeDaysObserved: days.length };
}

export type CtaStats = { views: number; clicks: number; ctr: number | null };

/** "CTA Clicks und CTA CTR". */
export async function getCtaStats(days = 30): Promise<CtaStats> {
  const rows = await db
    .select({ kind: brandAnalyticsEvents.kind, n: count() })
    .from(brandAnalyticsEvents)
    .where(gte(brandAnalyticsEvents.createdAt, daysAgo(days)))
    .groupBy(brandAnalyticsEvents.kind);
  const of = (kind: string) => Number(rows.find((r) => r.kind === kind)?.n ?? 0);
  const views = of("view");
  const clicks = of("cta_click");
  return { views, clicks, ctr: views > 0 ? (clicks / views) * 100 : null };
}

export type VoteFunnelStats = {
  contentOpened: number;
  voteClicked: number;
  loginRequired: number;
  registerStarted: number;
  registerCompleted: number;
  voteCompleted: number;
};

/**
 * BETA-2-G: "Content/Battle geöffnet → Vote geklickt → Login erforderlich →
 * Registrierung begonnen → Registrierung abgeschlossen → Vote abgeschlossen".
 * Bewusst Rohzahlen pro Schritt im Zeitraum, kein Versuch, jede einzelne
 * Person durch alle Schritte hindurch zu verfolgen (das würde eine robuste
 * anonId↔userId-Verknüpfung über den Login-Moment hinweg brauchen, siehe
 * Kommentar zu visitorEvents in schema.ts) — für die Beta reicht der grobe
 * Trichter aus Stufen-Zählungen, um die größten Abbruchpunkte zu sehen.
 */
export async function getVoteFunnel(days = 30): Promise<VoteFunnelStats> {
  const since = daysAgo(days);
  const [battleEvents, [registerStarted], [registerCompleted], [voteCompleted]] = await Promise.all([
    db
      .select({ kind: brandAnalyticsEvents.kind, n: count() })
      .from(brandAnalyticsEvents)
      .where(and(isNotNull(brandAnalyticsEvents.battleId), gte(brandAnalyticsEvents.createdAt, since)))
      .groupBy(brandAnalyticsEvents.kind),
    db
      .select({ n: countDistinct(visitorEvents.anonId) })
      .from(visitorEvents)
      .where(and(eq(visitorEvents.kind, "register_started"), gte(visitorEvents.createdAt, since))),
    db.select({ n: count() }).from(users).where(gte(users.createdAt, since)),
    db.select({ n: count() }).from(votes).where(gte(votes.createdAt, since)),
  ]);
  const of = (kind: string) => Number(battleEvents.find((r) => r.kind === kind)?.n ?? 0);

  return {
    contentOpened: of("view"),
    voteClicked: of("vote_click"),
    loginRequired: of("login_required"),
    registerStarted: Number(registerStarted?.n ?? 0),
    registerCompleted: Number(registerCompleted?.n ?? 0),
    voteCompleted: Number(voteCompleted?.n ?? 0),
  };
}

/** Anzeige-Name für die Art eines geteilten Links (ref vor dem Doppelpunkt). */
export function refTypeLabel(type: string): string {
  return (
    { solo: "Video", pitch: "Video", duel: "Duell", battle: "Duell", profile: "Profil", story: "Insta-Story", reaction: "Reaktion", challenge: "Challenge" }[
      type
    ] ?? type
  );
}

export type ReferralStats = {
  /** Geöffnete geteilte Links (App + Website) im Zeitraum. */
  opens: number;
  /** Nach Art des Geteilten (Video, Duell, Profil, Story …). */
  byType: { type: string; count: number }[];
  topRefs: { ref: string; count: number }[];
};

/**
 * "Herkunft über geteilte MarkItch-Links". Luca 14.11.: gezählt wird jedes
 * Öffnen eines geteilten Links ('shared_open') — in der App (Universal Link)
 * und auf der Website, ohne Gerätekennung, also auch ohne Statistik-Einwilligung.
 */
export async function getReferralStats(days = 30): Promise<ReferralStats> {
  const rows = await db
    .select({ ref: visitorEvents.ref })
    .from(visitorEvents)
    .where(and(eq(visitorEvents.kind, "shared_open"), gte(visitorEvents.createdAt, daysAgo(days))));

  const counts = new Map<string, number>();
  const types = new Map<string, number>();
  for (const r of rows) {
    if (!r.ref) continue;
    counts.set(r.ref, (counts.get(r.ref) ?? 0) + 1);
    const type = r.ref.split(":")[0] === "story" ? "story" : r.ref.split(":")[0];
    types.set(type, (types.get(type) ?? 0) + 1);
  }
  const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return {
    opens: rows.length,
    byType: sorted(types).map(([type, count]) => ({ type, count })),
    topRefs: sorted(counts).slice(0, 10).map(([ref, count]) => ({ ref, count })),
  };
}

export type ActiveBrandsStats = { totalBrands: number; activeLast30d: number; postedMoreThanOnce: number };

/** "Aktive Marken" / "Marken, die erneut posten" — direkt aus den Content-Tabellen, keine eigenen Events nötig. */
export async function getActiveBrandsStats(): Promise<ActiveBrandsStats> {
  const cutoff = daysAgo(30);
  // Luca 18.10.: zwei kleine Abfragen nacheinander statt vier parallel — live
  // wartete dieser Teil sonst auf freie Datenbank-Verbindungen und kam nie dran.
  const [total] = await db.select({ n: count() }).from(brands);
  const { rows } = await db.execute<{ brand_id: string; n: string | number; last: string | Date | null }>(sql`
    select brand_id, count(*) as n, max(posted_at) as last from (
      select ${soloPitches.brandId} as brand_id, ${soloPitches.createdAt} as posted_at from ${soloPitches}
      union all
      select ${battles.brandAId}, ${battles.brandASubmittedAt} from ${battles} where ${battles.brandASubmittedAt} is not null
      union all
      select ${battles.brandBId}, ${battles.brandBSubmittedAt} from ${battles} where ${battles.brandBSubmittedAt} is not null
    ) posts
    group by brand_id
  `);

  let activeLast30d = 0;
  let postedMoreThanOnce = 0;
  for (const r of rows) {
    if (Number(r.n) > 1) postedMoreThanOnce += 1;
    if (r.last && new Date(r.last) >= cutoff) activeLast30d += 1;
  }

  return { totalBrands: Number(total?.n ?? 0), activeLast30d, postedMoreThanOnce };
}

// ——— Luca 14.11.: Überblick für Investoren ———

export type PlatformOverview = {
  accounts: { total: number; viewers: number; businesses: number; creators: number; new7d: number; new30d: number };
  /** Eindeutige Geräte (App + Website) mit mindestens einem Ereignis — DAU = Ø der letzten 7 Tage. */
  activeDevices: { dau: number; wau: number; mau: number };
  content: { videos: number; videos30d: number; reactions: number; duels: number; duels30d: number };
  interactions30d: { views: number; completes: number; votes: number; likes: number; comments: number; follows: number; shares: number };
  links: { clicksTotal: number; clicks30d: number; codesSaved: number };
  /** Neue Konten pro Woche, die letzten 8 Wochen (älteste zuerst). */
  weeklySignups: { weekStart: string; count: number }[];
};

/**
 * Eine einzige Abfrage mit Unterabfragen — wie getActiveBrandsStats bewusst
 * nicht parallel, damit sie keine Datenbank-Verbindungen blockiert.
 */
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const { rows } = await db.execute<Record<string, string | number | null>>(sql`
    select
      (select count(*) from ${users}) as accounts_total,
      (select count(*) from ${users} u where not exists (select 1 from ${brandMembers} m where m.user_id = u.id)) as viewers,
      (select count(*) from ${brands} where kind = 'brand') as businesses,
      (select count(*) from ${brands} where kind = 'creator') as creators,
      (select count(*) from ${users} where created_at > now() - interval '7 days') as new_7d,
      (select count(*) from ${users} where created_at > now() - interval '30 days') as new_30d,
      (select count(distinct anon_id) from (
        select anon_id, created_at from ${brandAnalyticsEvents} where anon_id is not null and created_at > now() - interval '30 days'
        union all
        select anon_id, created_at from ${visitorEvents} where kind = 'session_start' and created_at > now() - interval '30 days'
      ) e) as mau,
      (select count(distinct anon_id) from (
        select anon_id from ${brandAnalyticsEvents} where anon_id is not null and created_at > now() - interval '7 days'
        union all
        select anon_id from ${visitorEvents} where kind = 'session_start' and created_at > now() - interval '7 days'
      ) e) as wau,
      (select coalesce(sum(n), 0) / 7.0 from (
        select date_trunc('day', created_at) as d, count(distinct anon_id) as n from (
          select anon_id, created_at from ${brandAnalyticsEvents} where anon_id is not null and created_at > now() - interval '7 days'
          union all
          select anon_id, created_at from ${visitorEvents} where kind = 'session_start' and created_at > now() - interval '7 days'
        ) e group by 1
      ) per_day) as dau,
      (select count(*) from ${soloPitches}) as videos,
      (select count(*) from ${soloPitches} where created_at > now() - interval '30 days') as videos_30d,
      (select count(*) from ${reactions}) as reactions,
      (select count(*) from ${battles}) as duels,
      (select count(*) from ${battles} where created_at > now() - interval '30 days') as duels_30d,
      (select count(*) from ${brandAnalyticsEvents} where kind = 'view' and created_at > now() - interval '30 days') as views_30d,
      (select count(*) from ${brandAnalyticsEvents} where kind = 'complete' and created_at > now() - interval '30 days') as completes_30d,
      (select count(*) from ${brandAnalyticsEvents} where kind = 'share' and created_at > now() - interval '30 days') as shares_30d,
      (select count(*) from ${votes} where created_at > now() - interval '30 days') as votes_30d,
      (select count(*) from ${likes} where created_at > now() - interval '30 days') as likes_30d,
      (select count(*) from ${comments} where created_at > now() - interval '30 days') as comments_30d,
      (select count(*) from ${follows} where created_at > now() - interval '30 days') as follows_30d,
      (select count(*) from ${brandAnalyticsEvents} where kind = 'cta_click') as clicks_total,
      (select count(*) from ${brandAnalyticsEvents} where kind = 'cta_click' and created_at > now() - interval '30 days') as clicks_30d,
      (select count(*) from ${savedCodes}) as codes_saved,
      (select coalesce(json_agg(w order by w.week), '[]'::json) from (
        select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week, count(*) as n
        from ${users} where created_at > date_trunc('week', now()) - interval '7 weeks'
        group by 1
      ) w) as weekly
  `);
  const r = rows[0] ?? {};
  const n = (key: string) => Number(r[key] ?? 0);

  // Lücken (Wochen ohne Anmeldung) mit 0 füllen.
  const weeklyRaw = (typeof r.weekly === "string" ? JSON.parse(r.weekly) : (r.weekly ?? [])) as { week: string; n: number }[];
  const byWeek = new Map(weeklyRaw.map((w) => [w.week, Number(w.n)]));
  const monday = new Date();
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weeklySignups = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - (7 - i) * 7);
    const key = dayKey(d);
    return { weekStart: key, count: byWeek.get(key) ?? 0 };
  });

  return {
    accounts: { total: n("accounts_total"), viewers: n("viewers"), businesses: n("businesses"), creators: n("creators"), new7d: n("new_7d"), new30d: n("new_30d") },
    activeDevices: { dau: Math.round(n("dau")), wau: n("wau"), mau: n("mau") },
    content: { videos: n("videos"), videos30d: n("videos_30d"), reactions: n("reactions"), duels: n("duels"), duels30d: n("duels_30d") },
    interactions30d: {
      views: n("views_30d"),
      completes: n("completes_30d"),
      votes: n("votes_30d"),
      likes: n("likes_30d"),
      comments: n("comments_30d"),
      follows: n("follows_30d"),
      shares: n("shares_30d"),
    },
    links: { clicksTotal: n("clicks_total"), clicks30d: n("clicks_30d"), codesSaved: n("codes_saved") },
    weeklySignups,
  };
}
