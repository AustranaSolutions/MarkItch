"use client";

import { useState } from "react";
import Link from "next/link";
import type { BlockedEntry } from "@/lib/block";
import { setBlocked } from "@/lib/block-client";

/** Luca 25.10.: wie in der App (settings/blocked.tsx) — Liste mit „Freigeben“. */
export function BlockedList({ initial }: { initial: BlockedEntry[] }) {
  const [entries, setEntries] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  if (entries.length === 0) return <p className="text-sm text-zinc-500">Du hast niemanden blockiert.</p>;
  return (
    <>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <ul className="divide-y divide-zinc-800">
        {entries.map((entry) => {
          const key = entry.kind === "brand" ? entry.brandId : entry.userId;
          return (
            <li key={key} className="flex items-center justify-between gap-3 py-3">
              {entry.kind === "brand" ? (
                <Link href={`/brands/${entry.slug}`} className="text-sm font-semibold text-white hover:underline">
                  {entry.name}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-white">{entry.name}</span>
              )}
              <button
                onClick={async () => {
                  setError(null);
                  try {
                    await setBlocked(entry.kind === "brand" ? { brandId: entry.brandId } : { userId: entry.userId }, false);
                    setEntries((list) => list.filter((e) => (e.kind === "brand" ? e.brandId : e.userId) !== key));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Hat nicht geklappt.");
                  }
                }}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500"
              >
                Freigeben
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
