"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Ticket, Trash2 } from "lucide-react";
import { deleteSavedCodeAction } from "@/app/actions/saved-codes";
import { useT } from "@/components/i18n/lang-provider";
import type { SavedCodeView } from "@/lib/saved-codes";

/** Luca 13.11. (Phase 3): „Meine Codes“ — Code kopieren, Link öffnen, zum Video, löschen. */
export function SavedCodeList({ codes }: { codes: SavedCodeView[] }) {
  const t = useT();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (codes.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        {t(
          "Noch keine Codes. Hat ein Video einen Rabattcode, wird er beim Antippen des Links kopiert und hier gespeichert.",
          "No codes yet. If a video has a discount code, it’s copied when you tap the link and saved here.",
        )}
      </p>
    );
  }

  function copy(id: string, code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    });
  }

  return (
    <ul className="divide-y divide-zinc-800">
      {codes.map((c) => (
        <li key={c.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <Link href={c.href} className="relative aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-md bg-zinc-900" aria-label={t("Zum Video", "Go to video")}>
            {c.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <video src={`${c.videoUrl}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/brands/${c.brandSlug}`} className="block truncate text-sm font-semibold text-white hover:underline">
              {c.brandName}
            </Link>
            <button
              type="button"
              onClick={() => copy(c.id, c.code)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-dashed border-orange-500/70 px-2 py-0.5 font-mono text-sm text-orange-400 hover:bg-orange-500/10"
            >
              <Ticket size={13} />
              {c.code}
              <span className="font-sans text-xs text-zinc-400">{copiedId === c.id ? t("kopiert", "copied") : <Copy size={12} />}</span>
            </button>
            <a
              href={c.ctaUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 flex items-center gap-1 truncate text-xs text-zinc-400 hover:text-white"
            >
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{c.ctaLabel ?? c.ctaUrl}</span>
            </a>
          </div>
          <form action={deleteSavedCodeAction}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" aria-label={t("Code entfernen", "Remove code")} className="p-1 text-zinc-500 hover:text-red-400">
              <Trash2 size={16} />
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
