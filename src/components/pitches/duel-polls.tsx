"use client";

import { useEffect, useState } from "react";
import { BarChart3, Check } from "lucide-react";
import { useT } from "@/components/i18n/lang-provider";
import { getGuestId, peekGuestId } from "@/lib/guest-votes-client";

// Luca 17.11. (5.5): Duell-Umfragen von MarkItch oben im Duelle-Bereich —
// „Welches Duell wollt ihr sehen?“. Antippen = abstimmen (auch ohne Konto),
// danach Prozente je Paarung.

type PollBrand = { id: string; name: string; slug: string; logoUrl: string | null };
export type DuelPoll = {
  id: string;
  title: string | null;
  total: number;
  viewerOptionId: string | null;
  options: { id: string; brandA: PollBrand; brandB: PollBrand; votes: number | null }[];
};

function Logo({ brand }: { brand: PollBrand }) {
  return brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
    <img src={brand.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
  ) : (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-bold text-zinc-500">
      {brand.name.charAt(0).toUpperCase()}
    </div>
  );
}

function PollCard({ poll, onChange }: { poll: DuelPoll; onChange: (p: DuelPoll) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voted = poll.viewerOptionId !== null;
  // „Marke A gegen B, C oder D“: A steht dann einmal oben, die Zeilen zeigen nur die Gegner.
  const shared = poll.options.every((o) => o.brandA.id === poll.options[0]?.brandA.id) ? poll.options[0]?.brandA : null;

  async function vote(optionId: string) {
    if (voted || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/duel-polls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, optionId, guestId: getGuestId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? t("Nicht möglich.", "Not possible."));
      else if (data.poll) onChange(data.poll);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-orange-400">
        <BarChart3 size={13} /> {t("Umfrage von MarkItch", "Poll by MarkItch")}
      </p>
      <h2 className="mb-3 text-base font-semibold text-white">{poll.title ?? t("Welches Duell wollt ihr sehen?", "Which duel do you want to see?")}</h2>
      {shared && (
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Logo brand={shared} /> <span className="truncate">{shared.name}</span>
          <span className="shrink-0 text-xs font-bold text-orange-500">{t("gegen …", "vs …")}</span>
        </p>
      )}
      <ul className="space-y-2">
        {poll.options.map((o) => {
          const pct = voted && poll.total > 0 ? Math.round(((o.votes ?? 0) / poll.total) * 100) : null;
          const mine = poll.viewerOptionId === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={voted || busy}
                onClick={() => vote(o.id)}
                className={`relative flex w-full items-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-left text-sm ${mine ? "border-orange-500/60" : "border-zinc-800"} ${voted ? "" : "hover:border-orange-400"} disabled:cursor-default`}
              >
                {pct !== null && <span className="absolute inset-y-0 left-0 bg-orange-500/15" style={{ width: `${pct}%` }} aria-hidden />}
                <span className="relative flex min-w-0 flex-1 items-center gap-2">
                  {shared ? (
                    <>
                      <Logo brand={o.brandB} />
                      <span className="truncate text-white">{o.brandB.name}</span>
                    </>
                  ) : (
                    <>
                      <Logo brand={o.brandA} />
                      <span className="truncate text-white">{o.brandA.name}</span>
                      <span className="shrink-0 text-xs font-bold text-orange-500">VS</span>
                      <span className="truncate text-white">{o.brandB.name}</span>
                      <Logo brand={o.brandB} />
                    </>
                  )}
                </span>
                {pct !== null && (
                  <span className="relative flex shrink-0 items-center gap-1 text-xs font-semibold text-zinc-300">
                    {mine && <Check size={12} className="text-orange-400" />}
                    {pct} %
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-zinc-500">
        {voted
          ? t(`${poll.total} ${poll.total === 1 ? "Stimme" : "Stimmen"}`, `${poll.total} ${poll.total === 1 ? "vote" : "votes"}`)
          : t("Antippen zum Abstimmen — das Ergebnis siehst du danach.", "Tap to vote — you’ll see the result afterwards.")}
      </p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}

export function DuelPolls() {
  const [polls, setPolls] = useState<DuelPoll[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const guestId = peekGuestId();
    fetch("/api/duel-polls", { signal: controller.signal, headers: guestId ? { "x-guest-id": guestId } : {} })
      .then((r) => (r.ok ? r.json() : { polls: [] }))
      .then((d: { polls?: DuelPoll[] }) => setPolls(d.polls ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <>
      {polls.map((p) => (
        <PollCard key={p.id} poll={p} onChange={(next) => setPolls((prev) => prev.map((x) => (x.id === next.id ? next : x)))} />
      ))}
    </>
  );
}
