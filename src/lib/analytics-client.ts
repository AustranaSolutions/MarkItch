"use client";

const ANON_ID_COOKIE = "mi_vid";
const ANON_ID_MAX_AGE_DAYS = 400; // Safaris eigene Obergrenze für client-gesetzte Cookies
const CONSENT_KEY = "mi_consent"; // "stats" | "necessary" — die Wahl selbst ist technisch notwendig

/**
 * Luca 18.10. (§ 165 Abs. 3 TKG 2021): ein wiedererkennbares Statistik-
 * Kennzeichen (Cookie) gibt es nur nach Einwilligung im Banner. Ohne
 * Einwilligung zählen wir weiter Aufrufe, aber mit einer Kennung, die nur im
 * Arbeitsspeicher dieser Seite lebt und nirgends auf dem Gerät landet.
 */
export type StatsConsent = "stats" | "necessary" | null;

export function getStatsConsent(): StatsConsent {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "stats" || value === "necessary" ? value : null;
  } catch {
    return null;
  }
}

export function setStatsConsent(value: "stats" | "necessary") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ohne Speicher gilt einfach „nur notwendige“
  }
  if (value === "necessary") {
    document.cookie = `${ANON_ID_COOKIE}=; path=/; max-age=0`;
    try {
      localStorage.removeItem("mi_session_date");
    } catch {}
  }
}

let memoryAnonId: string | null = null;

/** Zufällige Kennung ohne Personenbezug — dauerhaft (Cookie) nur mit Einwilligung, sonst nur für diesen Seitenaufruf. */
export function getOrCreateAnonId(): string {
  if (typeof document === "undefined") return "";
  if (getStatsConsent() !== "stats") {
    memoryAnonId ??= crypto.randomUUID();
    return memoryAnonId;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${ANON_ID_COOKIE}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);
  const id = crypto.randomUUID();
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${ANON_ID_COOKIE}=${id}; path=/; max-age=${ANON_ID_MAX_AGE_DAYS * 86400}; samesite=lax${secure}`;
  return id;
}

type QueuedEvent = {
  brandId: string;
  kind: "view" | "share" | "cta_click" | "vote_click" | "login_required";
  soloPitchId?: string;
  battleId?: string;
  anonId: string;
};

// Phase 48: die kleinste Supabase-Instanz (t4g.nano, "Burstable") kam beim
// gleichzeitigen Testen ins Straucheln — ein einzelnes INSERT pro Video-View
// beim Durchscrollen des Feeds erzeugt in Sekunden viele kleine, einzelne
// Datenbank-Verbindungen/Roundtrips. Statt jedes Event sofort einzeln zu
// schicken, sammelt dieser Puffer sie kurz und schickt sie gebündelt als ein
// einziges Insert — gleiche Information, deutlich weniger Last pro Video.
const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY_MS = 4000;
const FLUSH_MAX_QUEUE = 8;

function flush(useBeacon = false) {
  if (queue.length === 0) return;
  const events = queue.splice(0, queue.length);
  const body = JSON.stringify({ events });
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/analytics/track", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => {});
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_DELAY_MS);
}

if (typeof document !== "undefined") {
  // Beim Verlassen/Wechseln der Seite nicht auf den Timer warten — sonst
  // gehen die letzten paar Events einer Session (z.B. der allerletzte View)
  // beim Tab-Schließen verloren, bevor der Timer je feuert.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}

/** Fire-and-forget content-event tracking — never blocks or throws into the caller. Batched, siehe oben. */
export function trackAnalyticsEvent(
  brandId: string,
  kind: "view" | "share" | "cta_click" | "vote_click" | "login_required",
  target?: { soloPitchId?: string; battleId?: string },
) {
  queue.push({ brandId, kind, anonId: getOrCreateAnonId(), ...target });
  if (queue.length >= FLUSH_MAX_QUEUE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flush();
  } else {
    scheduleFlush();
  }
}

/** Fire-and-forget visitor-/account-level event tracking (session start, registration funnel). */
export function trackVisitorEvent(kind: "session_start" | "register_started", ref?: string | null) {
  fetch("/api/analytics/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonId: getOrCreateAnonId(), kind, ref }),
  }).catch(() => {});
}
