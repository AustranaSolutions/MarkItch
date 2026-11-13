"use client";

import { useEffect, useSyncExternalStore } from "react";

// Luca 13.11.: Auge = „Bildschirm frei“ für den ganzen Feed (wie in der App,
// lib/clean-screen.ts) — auch „Feed / Folge ich“ und die Glocke verschwinden.
// Die Kennzeichnung „Anzeige“/„KI“ bleibt klein stehen.

let hidden = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toggleCleanScreen() {
  hidden = !hidden;
  listeners.forEach((l) => l());
}

/** Luca 13.11. (2): gilt nur fürs aktuelle Video — wird eine Karte aktiv, ist alles wieder da. */
export function useResetCleanScreenWhenActive(active: boolean) {
  useEffect(() => {
    if (!active || !hidden) return;
    hidden = false;
    listeners.forEach((l) => l());
  }, [active]);
}

export function useCleanScreen(): boolean {
  return useSyncExternalStore(subscribe, () => hidden, () => false);
}
