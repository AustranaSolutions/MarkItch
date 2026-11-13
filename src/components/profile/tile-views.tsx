"use client";

import { Eye } from "lucide-react";
import { useLang } from "@/components/i18n/lang-provider";
import { compactNumber } from "@/lib/i18n";

/** Luca 13.11.: Aufrufe auf einer Profil-Kachel (statt Likes) — wie in der App. */
export function TileViews({ count, className = "left-1.5" }: { count: number; className?: string }) {
  const lang = useLang();
  return (
    <span className={`pointer-events-none absolute bottom-1.5 flex items-center gap-1 text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${className}`}>
      <Eye size={13} />
      {compactNumber(count, lang)}
    </span>
  );
}
