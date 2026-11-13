"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useVideoTrim, type Trim } from "@/lib/use-video-trim";
import { useT } from "@/components/i18n/lang-provider";
import { langOf, socialCount } from "@/lib/i18n";

export type ViewerReactionTile = {
  id: string;
  soloPitchId: string | null;
  /** Luca 05.11.: Challenge-Beitrag statt Reaktion auf einen Pitch. */
  creatorChallengeId?: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  likeCount: number;
  originalBrandName: string;
  /** Gekürzt → nur dieser Ausschnitt (wie im Feed). */
  trim?: Trim;
};


/** Luca 02.11.: Reaktions-Kacheln im Zuschauer-Profil; Antippen spielt die Reaktion (wie in der App), mit „Original ansehen“. */
export function ViewerReactionTiles({ reactions, own }: { reactions: ViewerReactionTile[]; own: boolean }) {
  const t = useT();
  const [open, setOpen] = useState<ViewerReactionTile | null>(null);
  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {reactions.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setOpen(r)}
              aria-label={own ? t(`Deine Reaktion auf ${r.originalBrandName}`, `Your reaction to ${r.originalBrandName}`) : t(`Reaktion auf ${r.originalBrandName}`, `Reaction to ${r.originalBrandName}`)}
              className="relative block aspect-[9/16] w-full overflow-hidden rounded-lg bg-zinc-900"
            >
              {r.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
                <img src={r.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={`${r.videoUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-left">
                <span className="block truncate text-xs font-semibold text-white">
                  {r.soloPitchId ? t("Auf", "To") : "Challenge"} {r.originalBrandName}
                </span>
                {socialCount(r.likeCount, langOf(t)) ? <span className="block text-[11px] text-zinc-300">♥ {socialCount(r.likeCount, langOf(t))}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={t("Reaktion", "Reaction")}>
          <div className="flex items-center justify-between px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}>
            <span className="text-sm font-semibold text-white">
              {open.soloPitchId ? t("Reaktion auf", "Reaction to") : t("Challenge von", "Challenge by")} {open.originalBrandName}
            </span>
            <button onClick={() => setOpen(null)} aria-label={t("Schließen", "Close")} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
              <X size={18} />
            </button>
          </div>
          <TrimmedVideo key={open.id} src={open.videoUrl} trim={open.trim} />
          <div className="p-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
            <Link
              href={open.soloPitchId ? `/?pitch=${open.soloPitchId}` : `/challenges/${open.creatorChallengeId}`}
              className="block rounded-full bg-orange-600 py-3 text-center text-sm font-bold text-white hover:bg-orange-500"
            >
              {open.soloPitchId ? t("Original ansehen", "View original") : t("Zur Challenge", "Go to challenge")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function TrimmedVideo({ src, trim }: { src: string; trim: Trim }) {
  const ref = useRef<HTMLVideoElement>(null);
  useVideoTrim(() => ref.current, trim);
  return <video ref={ref} src={src} autoPlay loop playsInline controls className="min-h-0 flex-1 bg-black object-contain" />;
}
