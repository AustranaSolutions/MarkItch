import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getOptionalUser } from "@/lib/session";
import { getBlockedIds } from "@/lib/block";
import { getOpenCastings } from "@/lib/casting";
import { getT } from "@/lib/lang";
import { type Translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function leftLabel(date: Date, t: Translate): string {
  const hours = Math.max(0, (date.getTime() - Date.now()) / 3_600_000);
  return hours >= 24 ? t(`noch ${Math.ceil(hours / 24)} Tage`, `${Math.ceil(hours / 24)} days left`) : t(`noch ${Math.max(1, Math.ceil(hours))} Std.`, `${Math.max(1, Math.ceil(hours))} hrs left`);
}

/**
 * Luca 17.11. (Phasen-Map 4.3): alle offenen Partner-Castings an einem Ort —
 * Marken suchen Creator („Wir suchen …“), Creator reichen ein Video ein.
 * Vorher fand man sie nur zufällig im Feed oder auf dem Profil der Marke.
 */
export default async function OpenCastingsPage() {
  const t = await getT();
  const viewer = await getOptionalUser();
  const castings = await getOpenCastings((await getBlockedIds(viewer?.id ?? null)).brandIds);
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-white">{t("Offene Castings", "Open castings")}</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {t("Marken suchen Creator. Reich ein Video ein — die Community stimmt ab, wer Partner wird.", "Brands are looking for creators. Submit a video — the community votes on who becomes the partner.")}
      </p>
      {castings.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Gerade sucht keine Marke — schau bald wieder vorbei.", "No brand is looking right now — check back soon.")}</p>
      ) : (
        <ul className="space-y-3">
          {castings.map((c) => (
            <li key={c.id}>
              <Link href={`/castings/${c.id}`} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-700">
                {c.hostBrand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
                  <img src={c.hostBrand.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800 font-bold text-zinc-500">{c.hostBrand.name.charAt(0).toUpperCase()}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-500">
                    {c.hostBrand.name} · {leftLabel(c.submissionDeadline, t)}
                    {c.submissionCount > 0 ? ` · ${c.submissionCount} ${c.submissionCount === 1 ? t("Video", "video") : t("Videos", "videos")}` : ""}
                  </p>
                  <p className="line-clamp-2 text-sm font-medium text-white">{c.prompt}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-zinc-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
