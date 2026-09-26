"use client";

import { useEffect } from "react";

// Phase 41: every route here was fully server-rendered with no
// `loading.tsx` anywhere in the app — Next.js showed *nothing* during a
// navigation until the destination page's data finished loading, which on
// a live deployment (especially inside the Capacitor WKWebView) reads as
// "did my tap even register?" (Luca: "wieso lagged alles so... es dauert
// paar Sekunden bis man auf dem Tab dann ist"). A `loading.tsx` per route
// segment shows this immediately on navigation while the real page streams
// in behind it — doesn't make the data faster, but the app now visibly
// reacts to every tap instantly instead of appearing frozen.
// Phase 48: 6000 → 2500 — Luca hängt an diesem Bug öfter als beim
// ursprünglichen Test in Phase 43 ("allein wenn ich auf ein Profil möchte,
// lädt er nur"), 6 Sekunden gefühlter Stillstand ist zu lang. Kürzer riskiert
// höchstens einen unnötigen Reload bei einer echt langsamen Verbindung, die
// sowieso noch gerechtfertigt fertig geladen hätte — kein echter Datenverlust.
const STUCK_RELOAD_MS = 2500;

/**
 * Phase 43: found a real, reproducible bug behind Luca's "lädt nur, erst
 * beim zweiten Klick geht's" reports — a client-side (Link/router) soft
 * navigation to a page can get stuck showing this component *forever*,
 * even though the exact same URL loads instantly and correctly as a hard
 * reload every single time (verified directly: the RSC fetch for the
 * click-triggered navigation shows 200 in the network panel but its body
 * never finishes streaming, while a fresh `navigate` to the identical URL
 * renders immediately). That points at a client-side router/prefetch-cache
 * issue in this Next.js version, not at slow data — the server side was
 * already ruled out. Rather than chase that framework internal further,
 * this is the pragmatic fix: if this "Lädt…" screen is still showing after
 * a few seconds, something is stuck, not just slow — force a real reload
 * of wherever the URL bar already points (the router updates the URL
 * immediately on navigation, before the content is ready), which our own
 * testing showed always works. Same philosophy as error.tsx: doesn't fix
 * the underlying framework quirk, turns "frozen forever" into "unstuck in
 * a few seconds" instead.
 */
export function RouteLoading() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload();
    }, STUCK_RELOAD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <p className="animate-pulse text-sm text-zinc-500">Lädt…</p>
    </div>
  );
}
