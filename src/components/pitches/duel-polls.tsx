"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Check, MessageCircle } from "lucide-react";
import { useT } from "@/components/i18n/lang-provider";
import { CommentSheet } from "@/components/feed/comment-sheet";
import { getGuestId, peekGuestId } from "@/lib/guest-votes-client";
import type { Translate } from "@/lib/i18n";

// Luca 17.11. (5.5): Duell-Umfragen von MarkItch — „Welches Duell wollt ihr
// sehen?“. Antippen = abstimmen (auch ohne Konto), danach Prozente je Paarung.
// Eigener Reiter „Umfragen“ auf /pitches und zwischendurch im Feed.

type PollBrand = { id: string; name: string; slug: string; logoUrl: string | null };
export type DuelPoll = {
  id: string;
  title: string | null;
  total: number;
  viewerOptionId: string | null;
  endsAt: string | null;
  commentCount: number;
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

function timeLeft(endsAt: string | null, t: Translate): string | null {
  if (!endsAt) return null;
  const hours = Math.max(0, (new Date(endsAt).getTime() - Date.now()) / 3_600_000);
  return hours >= 24
    ? t(`noch ${Math.ceil(hours / 24)} Tage`, `${Math.ceil(hours / 24)} days left`)
    : t(`noch ${Math.max(1, Math.ceil(hours))} Std.`, `${Math.max(1, Math.ceil(hours))} hrs left`);
}

/** Lädt die laufenden Umfragen (mit eigener Stimme, auch ohne Konto). */
export function useDuelPolls() {
  const [polls, setPolls] = useState<DuelPoll[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const guestId = peekGuestId();
    fetch("/api/duel-polls", { signal: controller.signal, headers: guestId ? { "x-guest-id": guestId } : {} })
      .then((r) => (r.ok ? r.json() : { polls: [] }))
      .then((d: { polls?: DuelPoll[] }) => setPolls(d.polls ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const update = useCallback((next: DuelPoll) => setPolls((prev) => prev?.map((x) => (x.id === next.id ? next : x)) ?? prev), []);
  const bumpComments = useCallback(
    (id: string) => setPolls((prev) => prev?.map((x) => (x.id === id ? { ...x, commentCount: x.commentCount + 1 } : x)) ?? prev),
    [],
  );
  return { polls, update, bumpComments };
}

export function PollCard({ poll, onChange, onOpenComments }: { poll: DuelPoll; onChange: (p: DuelPoll) => void; onOpenComments: (id: string) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voted = poll.viewerOptionId !== null;
  // „Marke A gegen B, C oder D“: A steht dann einmal oben, die Zeilen zeigen nur die Gegner.
  const shared = poll.options.every((o) => o.brandA.id === poll.options[0]?.brandA.id) ? poll.options[0]?.brandA : null;
  const left = timeLeft(poll.endsAt, t);

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
    <section className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-orange-400">
        <BarChart3 size={13} /> {t("Umfrage von MarkItch", "Poll by MarkItch")}
        {left && <span className="font-normal text-zinc-500">· {left}</span>}
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
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {voted
            ? t(`${poll.total} ${poll.total === 1 ? "Stimme" : "Stimmen"}`, `${poll.total} ${poll.total === 1 ? "vote" : "votes"}`)
            : t("Antippen zum Abstimmen", "Tap to vote")}
        </p>
        <button type="button" onClick={() => onOpenComments(poll.id)} className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white">
          <MessageCircle size={14} />
          {poll.commentCount > 0 ? poll.commentCount : t("Andere Marke?", "Other brand?")}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}

/** Reiter „Umfragen“ auf /pitches. */
export function DuelPolls({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useT();
  const { polls, update, bumpComments } = useDuelPolls();
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  if (polls === null) return null;
  return (
    <>
      {polls.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Gerade läuft keine Umfrage.", "No poll running right now.")}</p>
      ) : (
        <div className="space-y-4">
          {polls.map((p) => (
            <PollCard key={p.id} poll={p} onChange={update} onOpenComments={setCommentsFor} />
          ))}
        </div>
      )}
      {commentsFor && (
        <CommentSheet target={{ kind: "poll", id: commentsFor }} isLoggedIn={isLoggedIn} onClose={() => setCommentsFor(null)} onCommentPosted={bumpComments} />
      )}
    </>
  );
}

/** Im Feed: eine Umfrage als eigene Wisch-Seite zwischen den Videos. */
export function FeedPollSlide({ poll, onChange, onOpenComments }: { poll: DuelPoll; onChange: (p: DuelPoll) => void; onOpenComments: (id: string) => void }) {
  return (
    <div className="relative flex h-[calc(100dvh-var(--bottom-nav-h))] w-full snap-start snap-always items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <PollCard poll={poll} onChange={onChange} onOpenComments={onOpenComments} />
      </div>
    </div>
  );
}
