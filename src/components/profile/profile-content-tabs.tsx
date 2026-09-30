"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProfileChallenge, ProfileChallengeWinners } from "@/lib/brand-profile";
import { SoloPitchGrid } from "@/components/profile/solo-pitch-grid";
import { DuelGrid } from "@/components/profile/duel-grid";
import type { FeedSoloPitch, FeedDuel } from "@/lib/feed";

const COUNTRY_LABELS: Record<string, string> = {
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
  Other: "Andere",
};

export type ProfileInfo = {
  category: string;
  country: string;
  website: string | null;
  brandSlug: string;
  challenges: ProfileChallenge[];
  challengeWinners: ProfileChallengeWinners | null;
  isOwnBrand: boolean;
  activeCasting: { id: string; prompt: string } | null;
  castingWinner: { brandName: string; brandSlug: string } | null;
  latestFinishedCastingId: string | null;
};

/**
 * Phase 38: Luca's report — a profile only ever showed Solo-Pitches, never
 * the duels a brand actually took part in ("jedes Profil muss alle Videos
 * bei sich in den Kacheln haben, auch die Duell Videos"). Two tabs right
 * above the grid, Instagram-style (Reels vs. Posts), instead of mixing both
 * content types into one grid.
 *
 * Phase 40: the old pre-Solo-Pitch "Vorstellungsvideo" (brands.videoUrl)
 * that used to show here when a brand had no real Solo-Pitch yet is gone —
 * Luca: "das braucht keiner... es soll im Profil unter Videos einfach die
 * ganzen Solo-Pitch-Videos sein." The whole concept (settings upload form,
 * the counter-invite fallback) is retired, not just its display here.
 *
 * Phase 41: category/website/Creator-Charts/Partner-Casting used to sit in
 * a block below this whole component, after however many rows a brand's
 * grid takes — Luca: with ~100 posts nobody scrolls past the entire grid to
 * find it. Now a third tab, reachable with one tap regardless of grid
 * size. `info` is optional so a profile with nothing to show there (no
 * chart/casting/website yet — shouldn't happen in practice, `brand.category`
 * is required) can simply omit the tab.
 */
export function ProfileContentTabs({
  soloPitches,
  duels,
  profileBrandId,
  isLoggedIn,
  viewerBrandId,
  info,
}: {
  soloPitches: FeedSoloPitch[];
  duels: FeedDuel[];
  profileBrandId: string;
  isLoggedIn: boolean;
  viewerBrandId?: string | null;
  info: ProfileInfo;
}) {
  const [tab, setTab] = useState<"solo" | "duels" | "info">("solo");

  return (
    <div>
      <div className="mb-3 flex border-b border-zinc-800 text-sm font-medium">
        <button
          onClick={() => setTab("solo")}
          className={`flex-1 border-b-2 py-2.5 ${tab === "solo" ? "border-orange-500 text-white" : "border-transparent text-zinc-500"}`}
        >
          Videos ({soloPitches.length})
        </button>
        <button
          onClick={() => setTab("duels")}
          className={`flex-1 border-b-2 py-2.5 ${tab === "duels" ? "border-orange-500 text-white" : "border-transparent text-zinc-500"}`}
        >
          Duelle ({duels.length})
        </button>
        <button
          onClick={() => setTab("info")}
          className={`flex-1 border-b-2 py-2.5 ${tab === "info" ? "border-orange-500 text-white" : "border-transparent text-zinc-500"}`}
        >
          Info
        </button>
      </div>

      {tab === "solo" ? (
        soloPitches.length > 0 ? (
          <SoloPitchGrid initialPitches={soloPitches} isLoggedIn={isLoggedIn} viewerBrandId={viewerBrandId} />
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">Noch keine Videos gepostet.</p>
        )
      ) : tab === "duels" ? (
        duels.length > 0 ? (
          <DuelGrid duels={duels} isLoggedIn={isLoggedIn} ownBrandId={profileBrandId} />
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">Noch keine Duelle.</p>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 font-medium text-orange-400">{info.category}</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-medium text-zinc-400">
              {COUNTRY_LABELS[info.country] ?? info.country}
            </span>
          </div>

          {info.website && (
            <a href={info.website} target="_blank" rel="noopener noreferrer" className="block text-sm text-orange-500 hover:underline">
              {info.website} ↗
            </a>
          )}

          {/* RN-7: Creator-Challenges eröffnet nur die Marke selbst (statt offener Monats-Charts). */}
          {info.challenges.map((c) => (
            <div key={c.id} className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 text-center">
              <p className="mb-2 text-sm text-orange-300">
                🏆 Creator-Challenge {c.periodLabel}
                {c.stage === "upcoming" ? " (startet bald)" : ""}: „{c.prompt}“
              </p>
              <Link href={`/challenges/${c.id}`} className="text-sm font-semibold text-orange-400 hover:underline">
                {info.isOwnBrand ? "Ansehen" : "Ansehen & mitmachen"} →
              </Link>
            </div>
          ))}

          {info.challengeWinners && (
            <div className="rounded-lg border border-zinc-800 p-4 text-center">
              <p className="mb-1 text-sm text-zinc-300">🥇 Creator Winner {info.challengeWinners.periodLabel}</p>
              <p className="text-sm text-zinc-400">
                {info.challengeWinners.winners.map((w, i) => (
                  <span key={w.slug}>
                    {i > 0 ? " · " : ""}
                    {i + 1}.{" "}
                    <Link href={`/brands/${w.slug}`} className="text-orange-400 hover:underline">
                      {w.name}
                    </Link>
                  </span>
                ))}
              </p>
              <Link href={`/challenges/${info.challengeWinners.challengeId}`} className="mt-1 inline-block text-xs text-orange-400/80 hover:underline">
                Challenge ansehen →
              </Link>
            </div>
          )}

          {info.activeCasting && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 text-center">
              <p className="mb-2 text-sm text-orange-300">🎬 Partner-Casting läuft (neuer Partner gesucht): „{info.activeCasting.prompt}“</p>
              <Link href={`/castings/${info.activeCasting.id}`} className="text-sm font-semibold text-orange-400 hover:underline">
                {info.isOwnBrand ? "Ansehen" : "Ansehen & mitmachen"} →
              </Link>
            </div>
          )}

          {!info.activeCasting && info.castingWinner && info.latestFinishedCastingId && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 text-center">
              <p className="text-sm text-orange-300">
                🏆 Offizieller Partner:{" "}
                <Link href={`/brands/${info.castingWinner.brandSlug}`} className="font-semibold hover:underline">
                  {info.castingWinner.brandName}
                </Link>
              </p>
              <Link href={`/castings/${info.latestFinishedCastingId}`} className="mt-1 inline-block text-xs text-orange-400/80 hover:underline">
                Casting ansehen →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
