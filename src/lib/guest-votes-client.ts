"use client";

import { useSyncExternalStore } from "react";

// Luca 13.11. (Phase 5): Abstimmen ohne Konto auf der Website. Die zufällige
// Geräte-Kennung entsteht erst, wenn jemand ohne Konto abstimmt (technisch
// nötig, damit jedes Gerät nur einmal pro Duell stimmt) — siehe Datenschutz.

const ID_KEY = "mi_guest_id";
const VOTES_KEY = "mi_guest_votes";
const listeners = new Set<() => void>();
let cache: Record<string, string> | null = null;

function readVotes(): Record<string, string> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(VOTES_KEY) ?? "{}") as Record<string, string>;
  } catch {
    cache = {};
  }
  return cache;
}

export function getGuestId(): string | null {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function rememberGuestVote(battleId: string, brandId: string) {
  const entries = Object.entries({ ...readVotes(), [battleId]: brandId }).slice(-300);
  cache = Object.fromEntries(entries);
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(cache));
  } catch {
    // nur für die Anzeige — der Server lehnt doppelte Stimmen ohnehin ab
  }
  listeners.forEach((l) => l());
}

export function useGuestVote(battleId: string): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => readVotes()[battleId] ?? null,
    () => null,
  );
}
