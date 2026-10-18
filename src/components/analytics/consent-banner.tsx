"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStatsConsent, setStatsConsent } from "@/lib/analytics-client";

/**
 * Beide Knöpfe gleich gewichtet (keine Lenkung zur Zustimmung).
 *
 * Luca 18.10.: schlankes Einwilligungs-Banner fürs Web (§ 165 Abs. 3 TKG
 * 2021). Nur eine Frage: anonyme Nutzungsstatistik ja/nein. Keine Werbe-
 * oder Drittanbieter-Cookies — die gibt es auf MarkItch nicht.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Erst nach dem ersten Rendern prüfen (localStorage gibt es nur im Browser).
    const timer = setTimeout(() => setOpen(getStatsConsent() === null), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!open) return null;

  const choose = (value: "stats" | "necessary") => {
    setStatsConsent(value);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Statistik-Einwilligung"
      className="fixed inset-x-3 z-[90] mx-auto max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-xl"
      style={{ bottom: "calc(var(--bottom-nav-h) + 12px)" }}
    >
      <p className="text-sm text-zinc-300">
        Dürfen wir anonym zählen, wie oft Videos angesehen werden und ob Besucher:innen wiederkommen? Dafür setzen wir
        ein Cookie. Keine Werbung, kein Tracking über andere Seiten.{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Mehr dazu
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose("necessary")}
          className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-white hover:border-zinc-500"
        >
          Nur notwendige
        </button>
        <button
          type="button"
          onClick={() => choose("stats")}
          className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-white hover:border-zinc-500"
        >
          Statistik erlauben
        </button>
      </div>
    </div>
  );
}

/** Für die Datenschutzerklärung: Wahl jederzeit ändern. */
export function ConsentSettings() {
  const [consent, setConsent] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setConsent(getStatsConsent()), 0);
    return () => clearTimeout(timer);
  }, []);
  const change = (value: "stats" | "necessary") => {
    setStatsConsent(value);
    setConsent(value);
  };
  return (
    <span className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-zinc-500">
        Deine Wahl auf diesem Gerät: {consent === "stats" ? "Statistik erlaubt" : consent === "necessary" ? "nur notwendige" : "noch keine"}
      </span>
      <button type="button" onClick={() => change(consent === "stats" ? "necessary" : "stats")} className="text-orange-400 hover:underline">
        {consent === "stats" ? "Statistik widerrufen" : "Statistik erlauben"}
      </button>
    </span>
  );
}
