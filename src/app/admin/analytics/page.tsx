import Link from "next/link";
import { requireAdminUser } from "@/lib/moderation";
import {
  getActiveBrandsStats,
  getCtaStats,
  getPlatformOverview,
  refTypeLabel,
  getReferralStats,
  getRetention,
  getVideosPerSessionStats,
  getVisitorStats,
  getVoteFunnel,
} from "@/lib/platform-analytics";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

const de = (n: number) => n.toLocaleString("de-AT");

function pct(n: number | null): string {
  return n === null ? "—" : `${n.toFixed(0)}%`;
}

function FunnelStep({ label, value, of }: { label: string; value: number; of: number }) {
  const rate = of > 0 ? Math.min(100, (value / of) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-orange-500" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

/**
 * Phase 47: internes Dashboard für BETA-2-F/G (siehe
 * MarkItch_Launch_Minimum_Claude_Code_Prompt.md) — kein nutzerseitiges
 * Feature, nur für Luca, gleiche ADMIN_EMAILS-Gate wie /admin/moderation.
 */
export default async function AnalyticsAdminPage() {
  await requireAdminUser();

  // Luca 14.11.: Überblick für Investoren zuerst (eine Abfrage).
  const overview = await getPlatformOverview();
  const [visitors, videosPerSession, retention, cta, voteFunnel, referrals, brandsStats] = await Promise.all([
    getVisitorStats(30),
    getVideosPerSessionStats(14),
    getRetention(),
    getCtaStats(30),
    getVoteFunnel(30),
    getReferralStats(30),
    getActiveBrandsStats(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <Link href="/admin/moderation" className="text-sm text-zinc-500 hover:text-zinc-300">
          Moderation →
        </Link>
        <Link href="/admin/boosts" className="text-sm text-zinc-500 hover:text-zinc-300">
          Boosts →
        </Link>
      </div>
      <p className="mb-8 text-xs text-zinc-600">
        Letzte 30 Tage, sofern nicht anders angegeben. Anonyme, cookiebasierte Zählung — kein Personenbezug.
      </p>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-white">Überblick</h2>
        <p className="mb-4 text-xs text-zinc-600">
          Die wichtigsten Zahlen der ganzen Plattform (App + Website), z. B. für Investoren. „Aktive Konten“ = mindestens eine
          Aktion (Stimme, Like, Meinung, Folgen, Reaktion, Post); reines Zuschauen ohne Konto zählt bei „Sitzungen“.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Konten gesamt" value={de(overview.accounts.total)} />
          <Stat label="Neue Konten (7 / 30 Tage)" value={`${de(overview.accounts.new7d)} / ${de(overview.accounts.new30d)}`} />
          <Stat label="Zuschauer · Unternehmen · Creator" value={`${de(overview.accounts.viewers)} · ${de(overview.accounts.businesses)} · ${de(overview.accounts.creators)}`} />
          <Stat label="Aktive Konten pro Tag (Ø 7 Tage)" value={de(overview.activeAccounts.dau)} />
          <Stat label="Aktive Konten (7 / 30 Tage)" value={`${de(overview.activeAccounts.wau)} / ${de(overview.activeAccounts.mau)}`} />
          <Stat label="Tägliche Nutzung (DAU/MAU)" value={overview.activeAccounts.mau > 0 ? pct((overview.activeAccounts.dau / overview.activeAccounts.mau) * 100) : "—"} />
          <Stat label="Sitzungen pro Tag (Ø 7 Tage)" value={de(overview.activeDevices.dau)} />
          <Stat label="Sitzungen (7 / 30 Tage)" value={`${de(overview.activeDevices.wau)} / ${de(overview.activeDevices.mau)}`} />
          <Stat label="Link-Klicks gesamt" value={de(overview.links.clicksTotal)} />
          <Stat label="Link-Klicks (30 Tage)" value={de(overview.links.clicks30d)} />
          <Stat label="Gespeicherte Rabattcodes" value={de(overview.links.codesSaved)} />
          <Stat label="Videos gesamt (30 Tage)" value={`${de(overview.content.videos)} (${de(overview.content.videos30d)})`} />
          <Stat label="Duelle gesamt (30 Tage)" value={`${de(overview.content.duels)} (${de(overview.content.duels30d)})`} />
          <Stat label="Reaktionen gesamt" value={de(overview.content.reactions)} />
          <Stat label="Aufrufe (30 Tage)" value={de(overview.interactions30d.views)} />
          <Stat
            label="Bis zum Ende angesehen"
            value={overview.interactions30d.views > 0 ? pct((overview.interactions30d.completes / overview.interactions30d.views) * 100) : "—"}
          />
          <Stat label="Stimmen (30 Tage)" value={de(overview.interactions30d.votes)} />
          <Stat label="Likes · Meinungen (30 Tage)" value={`${de(overview.interactions30d.likes)} · ${de(overview.interactions30d.comments)}`} />
          <Stat label="Neue Follows (30 Tage)" value={de(overview.interactions30d.follows)} />
          <Stat label="Geteilt (30 Tage)" value={de(overview.interactions30d.shares)} />
        </div>
        <h3 className="mb-2 mt-6 text-sm font-semibold text-zinc-300">Neue Konten pro Woche</h3>
        <div className="flex h-24 items-end gap-2">
          {overview.weeklySignups.map((w) => {
            const max = Math.max(1, ...overview.weeklySignups.map((x) => x.count));
            return (
              <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1" title={`Woche ab ${w.weekStart}: ${w.count}`}>
                <span className="text-[10px] text-zinc-400">{w.count}</span>
                <div className="w-full rounded-t bg-orange-500" style={{ height: `${Math.max(2, (w.count / max) * 64)}px` }} />
                <span className="text-[10px] text-zinc-600">{w.weekStart.slice(8, 10)}.{w.weekStart.slice(5, 7)}.</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-white">Website-Besucher</h2>
        <p className="mb-4 text-xs text-zinc-600">Nur Website-Besuche mit Statistik-Einwilligung.</p>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Eindeutige Besucher (30d)" value={String(visitors.uniqueVisitors)} />
          <Stat label="Sessions insgesamt (30d)" value={String(visitors.sessionStarts)} />
          <Stat label="Aktive Marken (30d)" value={String(brandsStats.activeLast30d)} />
          <Stat label="Marken insgesamt" value={String(brandsStats.totalBrands)} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-white">Engagement pro Session (14 Tage)</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Sessions mit Videoansicht" value={String(videosPerSession.sessionsWithViews)} />
          <Stat label="Ø Videos pro Session" value={videosPerSession.avgVideosPerSession.toFixed(1)} />
          <Stat label="≥3 Videos angesehen" value={pct(videosPerSession.pctReaching3)} />
          <Stat label="≥5 Videos angesehen" value={pct(videosPerSession.pctReaching5)} />
          <Stat label="≥10 Videos angesehen" value={pct(videosPerSession.pctReaching10)} />
          <Stat label="CTA-CTR" value={pct(cta.ctr)} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold text-white">Retention</h2>
        <p className="mb-4 text-xs text-zinc-600">
          Anteil wiederkehrender Besucher — {retention.activeDaysObserved} Tage mit Aktivität beobachtet. „—“ heißt: noch
          nicht genug Daten für diesen Zeitraum.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="D1-Retention" value={pct(retention.d1)} />
          <Stat label="D7-Retention" value={pct(retention.d7)} />
          <Stat label="D30-Retention" value={pct(retention.d30)} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold text-white">Vote-Funnel (30 Tage)</h2>
        <p className="mb-4 text-xs text-zinc-600">
          Rohzahlen pro Stufe, kein Eins-zu-eins-Tracking über Login/Registrierung hinweg — siehe Kommentar in
          platform-analytics.ts.
        </p>
        <FunnelStep label="Duell geöffnet" value={voteFunnel.contentOpened} of={voteFunnel.contentOpened} />
        <FunnelStep label="Vote geklickt" value={voteFunnel.voteClicked} of={voteFunnel.contentOpened} />
        <FunnelStep label="Login erforderlich" value={voteFunnel.loginRequired} of={voteFunnel.contentOpened} />
        <FunnelStep label="Registrierung begonnen" value={voteFunnel.registerStarted} of={voteFunnel.contentOpened} />
        <FunnelStep label="Registrierung abgeschlossen" value={voteFunnel.registerCompleted} of={voteFunnel.contentOpened} />
        <FunnelStep label="Vote abgeschlossen" value={voteFunnel.voteCompleted} of={voteFunnel.contentOpened} />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-white">Geteilte Links geöffnet (30 Tage)</h2>
        <p className="mb-4 text-xs text-zinc-600">
          Wie oft jemand einen aus MarkItch geteilten Link (WhatsApp, Insta-Story …) geöffnet hat — in der App oder auf der
          Website. Zeigt, wie viel Reichweite das Teilen bringt.
        </p>
        {referrals.opens === 0 ? (
          <p className="text-sm text-zinc-500">Noch kein geteilter Link geöffnet.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-zinc-300">{de(referrals.opens)} Mal geöffnet</p>
            <ul className="space-y-1 text-sm text-zinc-300">
              {referrals.byType.map((r) => (
                <li key={r.type} className="flex justify-between">
                  <span className="text-zinc-400">{refTypeLabel(r.type)}</span>
                  <span className="font-semibold text-white">{de(r.count)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
