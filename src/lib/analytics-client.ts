"use client";

const ANON_ID_COOKIE = "mi_vid";
const ANON_ID_MAX_AGE_DAYS = 400; // Safaris eigene Obergrenze für client-gesetzte Cookies

/**
 * Phase 47: anonymes, zufälliges Besucher-Kennzeichen (kein Personenbezug —
 * kein Name/E-Mail/Login nötig) für Sessions/Besucher-Zählung, "Videos pro
 * Session" und D1/D7/D30-Retention (siehe visitorEvents in schema.ts). Bleibt
 * über Logins hinweg dasselbe Cookie, wird aber nie mit einer Identität
 * verknüpft, nur optional mit userId, wenn zum Zeitpunkt des Events
 * eingeloggt war (serverseitig in /api/analytics/visit ergänzt).
 */
export function getOrCreateAnonId(): string {
  if (typeof document === "undefined") return "";
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
