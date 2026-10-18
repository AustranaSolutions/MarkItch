"use client";

import { useEffect } from "react";
import { getStatsConsent, trackVisitorEvent } from "@/lib/analytics-client";

const SESSION_DATE_KEY = "mi_session_date";

/**
 * Phase 47: feuert höchstens einmal pro Kalendertag ein 'session_start' —
 * bewusst kein echtes 30-Minuten-Session-Timeout wie klassisches Web-
 * Analytics, sondern (anonId, Tag) als einfache, robuste Näherung fürs Beta-
 * Maß "Sessions/Besucher" (siehe getVisitorStats in platform-analytics.ts).
 * Nimmt einen ?ref=-Parameter aus einem geteilten Link mit (siehe
 * feed-client.tsx's handleShare/handleShareSolo) für "Herkunft über geteilte
 * MarkItch-Links".
 */
export function SessionBoot() {
  useEffect(() => {
    // Luca 18.10.: Besuche/Wiederkehr nur mit Einwilligung (braucht Speicher auf dem Gerät).
    if (getStatsConsent() !== "stats") return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(SESSION_DATE_KEY) === today) return;
      localStorage.setItem(SESSION_DATE_KEY, today);
    } catch {
      return; // kein verlässliches "schon heute gezählt" — lieber gar nicht zählen als doppelt
    }
    const ref = new URLSearchParams(window.location.search).get("ref");
    trackVisitorEvent("session_start", ref);
  }, []);

  return null;
}
