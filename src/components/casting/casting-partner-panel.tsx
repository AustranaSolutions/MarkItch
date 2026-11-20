"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n/lang-provider";

type Partner = { brandName: string; brandSlug: string; removalRequested: boolean };

/**
 * Luca 20.11. (7.5): Partner-Abzeichen auf der Casting-Seite — Marke
 * bestätigt ihren Partner, beide Marken können das Entfernen beantragen,
 * ein Admin entscheidet. Gleiche Schnittstellen wie die App.
 */
export function CastingPartnerPanel({
  castingId,
  hostName,
  partner,
  submissions,
  canChoose,
  canRequestRemoval,
  canDecide,
}: {
  castingId: string;
  hostName: string;
  partner: Partner | null;
  submissions: { id: string; brandName: string; voteCount: number }[];
  canChoose: boolean;
  canRequestRemoval: boolean;
  canDecide: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [choice, setChoice] = useState<string>(submissions[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const call = async (path: string, body: unknown, success: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mobile/castings/${castingId}/partner${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("Nicht möglich.", "Not possible."));
      setDone(success);
      setAsking(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nicht möglich.", "Not possible."));
    } finally {
      setBusy(false);
    }
  };

  if (!partner && !canChoose) return null;
  const chosen = submissions.find((s) => s.id === choice);

  return (
    <div className="mb-6 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 text-sm">
      {partner ? (
        <p className="text-orange-200">
          🤝 {t("Offizieller Partner von", "Official partner of")} {hostName}:{" "}
          <Link href={`/brands/${partner.brandSlug}`} className="font-semibold text-white hover:underline">
            {partner.brandName}
          </Link>
        </p>
      ) : (
        <>
          <p className="mb-3 text-orange-200">
            {t(
              "Mit wem arbeitest du zusammen? Bestätige deinen Partner — er bekommt das Abzeichen „Offizieller Partner“ im Profil. Ändern geht danach nur über MarkItch.",
              "Who are you working with? Confirm your partner — they get the “Official partner” badge on their profile. Changing it afterwards goes through MarkItch.",
            )}
          </p>
          <select
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
          >
            {submissions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.brandName} · {s.voteCount} {s.voteCount === 1 ? t("Stimme", "vote") : t("Stimmen", "votes")}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !chosen}
            onClick={() => {
              if (chosen && window.confirm(t(`${chosen.brandName} als offiziellen Partner bestätigen?`, `Confirm ${chosen.brandName} as your official partner?`)))
                call("", { submissionId: choice }, t("Bestätigt.", "Confirmed."));
            }}
            className="w-full rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
          >
            {t("Als Partner bestätigen", "Confirm as partner")}
          </button>
        </>
      )}

      {partner?.removalRequested && (
        <p className="mt-2 text-xs text-zinc-400">{t("Entfernen beantragt — MarkItch prüft.", "Removal requested — MarkItch is reviewing.")}</p>
      )}

      {canRequestRemoval &&
        (asking ? (
          <div className="mt-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("Warum soll das Abzeichen weg?", "Why should the badge be removed?")}
              className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => call("/removal", { note }, t("Beantragt — wir melden uns.", "Requested — we’ll get back to you."))}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-900 disabled:opacity-50"
            >
              {t("An MarkItch senden", "Send to MarkItch")}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAsking(true)} className="mt-2 text-xs text-zinc-400 hover:text-white">
            {t("Abzeichen entfernen lassen …", "Request badge removal …")}
          </button>
        ))}

      {canDecide && (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => call("/decision", { remove: true }, "Entfernt.")} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            Admin: Abzeichen entfernen
          </button>
          <button type="button" disabled={busy} onClick={() => call("/decision", { remove: false }, "Bleibt.")} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-white disabled:opacity-50">
            Admin: Antrag ablehnen
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {done && <p className="mt-2 text-xs text-emerald-400">{done}</p>}
    </div>
  );
}
