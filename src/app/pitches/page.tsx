import Link from "next/link";
import { getUpcomingBattles } from "@/lib/upcoming-battles";
import { getOptionalUser } from "@/lib/session";
import { getRemindedBattleIds } from "@/lib/reminder";
import { ReminderButton } from "@/components/pitches/reminder-button";
import { LiveDuelList } from "@/components/pitches/live-duel-list";
import { DuelPolls } from "@/components/pitches/duel-polls";
import { getLiveAndFinishedFeedDuels } from "@/lib/feed";
import { FinishedDuelList } from "@/components/pitches/finished-duel-list";
import { getBrandForUser } from "@/lib/brand";
import { getT } from "@/lib/lang";
import { duelCategoryLabel, langOf, type Translate } from "@/lib/i18n";

// Always live data — without this, Next prerenders it once at build time
// (no dynamic API is used otherwise) and it would never show a battle
// created after the last deploy.
export const dynamic = "force-dynamic";

function BrandThumb({ brand }: { brand: { name: string; logoUrl: string | null } }) {
  return brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
    <img src={brand.logoUrl} alt={brand.name} className="h-12 w-12 rounded-lg object-cover" />
  ) : (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-lg font-bold text-zinc-500">
      {brand.name.charAt(0).toUpperCase()}
    </div>
  );
}

function deadlineLabel(deadline: Date | null, t: Translate): string | null {
  if (!deadline) return null;
  const hoursLeft = Math.max(0, (deadline.getTime() - Date.now()) / (60 * 60 * 1000));
  const label = hoursLeft >= 24 ? t(`noch ${Math.ceil(hoursLeft / 24)} Tage`, `${Math.ceil(hoursLeft / 24)} days`) : t(`noch ${Math.max(1, Math.ceil(hoursLeft))}h`, `${Math.max(1, Math.ceil(hoursLeft))}h`);
  return t(`Kommt spätestens in ${label}`, `Coming within ${label}`);
}

// Phase 10: this is now purely a "kommt bald" preview — every Duell that's
// still waiting on at least one video. A Duell with both videos in is only
// ever watched/voted on in the Feed (see src/lib/feed.ts's eligibility
// filter and page.tsx's redirect for the old per-battle URL) — showing it
// here too was the exact overlap the user flagged: two different-looking
// places to do the same thing, one of them a dead end with no way back.
// So the split is now clean: Pitches = anticipation + reminders,
// Feed = the only place to actually watch/vote/comment.
// Luca 26.10.: Reiter „Demnächst“ / „Live“ wie in der App (?tab=live).
export default async function PitchesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await getT();
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "live" ? "live" : rawTab === "done" ? "done" : rawTab === "polls" ? "polls" : "soon";
  const viewer = await getOptionalUser();
  const [upcoming, { live, finished }, viewerBrand] = await Promise.all([
    getUpcomingBattles(),
    getLiveAndFinishedFeedDuels(viewer?.id ?? null),
    viewer ? getBrandForUser(viewer.id) : Promise.resolve(null),
  ]);
  const remindedIds = viewer ? new Set(await getRemindedBattleIds(viewer.id)) : new Set<string>();

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-white">{t("Duelle", "Duels")}</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {tab === "soon"
          ? t("Kommende Duelle — merk dir eins vor, dann sagen wir dir Bescheid, sobald es live geht.", "Upcoming duels — set a reminder and we’ll let you know as soon as one goes live.")
          : tab === "live"
            ? t("Duelle, bei denen gerade abgestimmt wird — antippen und wie im Feed durchwischen.", "Duels open for voting right now — tap one and swipe through like in the feed.")
            : tab === "done"
              ? t("Wer hat gewonnen? Antippen und durchwischen.", "Who won? Tap and swipe through.")
            : t("Welches Duell wollt ihr sehen? Stimm ab — MarkItch lädt die Marken ein.", "Which duel do you want to see? Vote — MarkItch invites the brands.")}
      </p>

      {viewerBrand && (
        <Link
          href="/profile/settings"
          className="mb-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-900"
        >
          {t("✉️ Duell-Einladungen", "✉️ Duel invites")}
          <span className="text-zinc-500">›</span>
        </Link>
      )}

      {/* Wie die Reiter im Profil (Videos · Duelle · Aktionen). */}
      <div className="mb-6 flex border-b border-zinc-800">
        {(
          [
            ["soon", t("Demnächst", "Coming soon"), upcoming.length],
            ["live", "Live", live.length],
            ["done", t("Beendet", "Ended"), 0],
            // Luca 17.11. (5.5): Umfragen als eigener Reiter, damit viele Umfragen die Liste nicht verdrängen.
            ["polls", t("Umfragen", "Polls"), 0],
          ] as const
        ).map(([key, label, n]) => (
          <Link
            key={key}
            href={key === "soon" ? "/pitches" : `/pitches?tab=${key}`}
            className={`-mb-px flex-1 border-b-2 py-2.5 text-center text-sm ${tab === key ? "border-orange-500 font-semibold text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
          >
            {label}
            {n > 0 ? ` (${n})` : ""}
          </Link>
        ))}
      </div>

      {tab === "polls" ? (
        <DuelPolls isLoggedIn={Boolean(viewer)} />
      ) : tab === "done" ? (
        <FinishedDuelList duels={finished} isLoggedIn={Boolean(viewer)} />
      ) : tab === "live" ? (
        <LiveDuelList duels={live} isLoggedIn={Boolean(viewer)} />
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Gerade kommt nichts Neues — schau später wieder vorbei.", "Nothing new right now — check back later.")}</p>
      ) : (
        <ul className="space-y-3">
          {upcoming.map(({ battle, deadline: productionDeadline }) => {
            const deadline = deadlineLabel(productionDeadline, t);

            return (
              <li key={battle.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BrandThumb brand={battle.brandA} />
                    <span className="text-sm font-medium text-white">{battle.brandA.name}</span>
                  </div>
                  <span className="text-lg font-bold text-orange-500">VS</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{battle.brandB.name}</span>
                    <BrandThumb brand={battle.brandB} />
                  </div>
                </div>
                {battle.category ? <p className="mt-3 text-center text-xs text-zinc-500">{duelCategoryLabel(battle.category, langOf(t))}</p> : null}
                <div className="mt-3 flex items-center justify-center gap-3">
                  {deadline && <span className="text-xs text-zinc-600">{deadline}</span>}
                  {viewer ? (
                    <ReminderButton battleId={battle.id} hasReminder={remindedIds.has(battle.id)} />
                  ) : (
                    <Link href="/login" className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-orange-400 hover:text-orange-400">
                      {t("🔔 Anmelden zum Erinnern", "🔔 Log in to get reminded")}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
