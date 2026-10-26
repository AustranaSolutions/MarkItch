"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { StandaloneDuelFeed } from "@/components/profile/standalone-duel-feed";
import type { FeedDuel } from "@/lib/feed";

// Luca 26.10.: Pitches → Reiter „Live“ — gleicher Kartenaufbau wie „Demnächst“,
// antippen öffnet das Duell wie im Feed, Wischen zeigt die nächsten Live-Duelle.

function Thumb({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
    <img src={logoUrl} alt={name} className="h-12 w-12 rounded-lg object-cover" />
  ) : (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-lg font-bold text-zinc-500">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function endsLabel(votingEndsAt: string | null): string {
  if (!votingEndsAt) return "Abstimmung läuft";
  const hoursLeft = Math.max(0, (new Date(votingEndsAt).getTime() - Date.now()) / (60 * 60 * 1000));
  return `Abstimmung läuft noch ${hoursLeft >= 24 ? `${Math.ceil(hoursLeft / 24)} Tage` : `${Math.max(1, Math.ceil(hoursLeft))}h`}`;
}

export function LiveDuelList({ duels, isLoggedIn }: { duels: FeedDuel[]; isLoggedIn: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (duels.length === 0) {
    return <p className="text-sm text-zinc-500">Gerade läuft kein Duell — schau unter „Demnächst“, was bald startet.</p>;
  }
  return (
    <>
      <ul className="space-y-3">
        {duels.map((duel, index) => {
          const [a, b] = duel.sides;
          const votes = duel.tally.total;
          return (
            <li key={duel.key}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenIndex(index)}
                onKeyDown={(e) => e.key === "Enter" && setOpenIndex(index)}
                className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/brands/${a.brandSlug}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                    <Thumb name={a.brandName} logoUrl={a.brandLogoUrl} />
                    <span className="text-sm font-medium text-white">{a.brandName}</span>
                  </Link>
                  <span className="text-lg font-bold text-orange-500">VS</span>
                  <Link href={`/brands/${b.brandSlug}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{b.brandName}</span>
                    <Thumb name={b.brandName} logoUrl={b.brandLogoUrl} />
                  </Link>
                </div>
                {duel.category ? <p className="mt-3 text-center text-xs text-zinc-500">{duel.category}</p> : null}
                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="text-xs text-zinc-600">
                    {endsLabel(duel.votingEndsAt)}
                    {votes > 0 ? ` · ${votes} ${votes === 1 ? "Stimme" : "Stimmen"}` : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300">
                    <Play size={12} /> Ansehen
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {openIndex !== null && (
        <StandaloneDuelFeed duels={duels} startIndex={openIndex} isLoggedIn={isLoggedIn} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
