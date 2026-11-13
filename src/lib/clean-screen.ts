"use client";

import { useSyncExternalStore } from "react";

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

export function useCleanScreen(): boolean {
  return useSyncExternalStore(subscribe, () => hidden, () => false);
}
