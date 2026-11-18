import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getOptionalUser } from "@/lib/session";
import { getBlockedIds } from "@/lib/block";
import { getOpenCastings } from "@/lib/casting";
import { getAllRunningChallenges } from "@/lib/creator-challenge";
import { periodLabel } from "@/lib/creator-charts";
import { getFollowedBrandIds } from "@/lib/follow";
import { getT } from "@/lib/lang";
import { type Translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function leftLabel(date: Date, t: Translate): string {
  const hours = (date.getTime() - Date.now()) / 3_600_000;
  if (hours <= 0) return t("endet gerade", "ending now");
  return hours >= 24 ? t(`noch ${Math.ceil(hours / 24)} Tage`, `${Math.ceil(hours / 24)} days left`) : t(`noch ${Math.max(1, Math.ceil(hours))} Std.`, `${Math.max(1, Math.ceil(hours))} hrs left`);
}

function Logo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
    <img src={logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
  ) : (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800 font-bold text-zinc-500">{name.charAt(0).toUpperCase()}</div>
  );
}

function Row({ href, logo, meta, text }: { href: string; logo: { name: string; logoUrl: string | null }; meta: string; text: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-700">
        <Logo {...logo} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500">{meta}</p>
          <p className="line-clamp-2 text-sm font-medium text-white">{text}</p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
      </Link>
    </li>
  );
}

/**
 * Luca 17.11. (Phasen-Map 4.3): alle laufenden Partner-Castings und (18.11.)
 * Creator-Challenges an einem Ort — vorher fand man sie nur zufällig im Feed
 * oder auf dem Profil der Marke.
 */
export default async function CastingsAndChallengesPage() {
  const t = await getT();
  const viewer = await getOptionalUser();
  const [{ brandIds: blocked }, followedIds] = await Promise.all([getBlockedIds(viewer?.id ?? null), viewer ? getFollowedBrandIds(viewer.id) : Promise.resolve([] as string[])]);
  const followed = new Set(followedIds);
  // Luca 18.11.: gefolgte Marken zuerst, sonst begrenzt (bei sehr vielen Marken).
  const [castings, challenges] = await Promise.all([getOpenCastings(blocked, followed), getAllRunningChallenges(followedIds)]);
  const visibleChallenges = challenges.filter((c) => !blocked.has(c.brandId)).sort((a, b) => Number(followed.has(b.brandId)) - Number(followed.has(a.brandId)));
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-white">{t("Castings & Challenges", "Castings & challenges")}</h1>
      <p className="mb-6 text-sm text-zinc-500">{t("Marken suchen Creator und Ideen. Mach mit — die Community stimmt ab.", "Brands are looking for creators and ideas. Join in — the community votes.")}</p>

      <h2 className="mb-2 text-sm font-semibold text-white">{t("Partner-Castings", "Partner castings")}</h2>
      {castings.length === 0 ? (
        <p className="mb-6 text-sm text-zinc-500">{t("Gerade läuft kein Casting.", "No casting running right now.")}</p>
      ) : (
        <ul className="mb-6 space-y-3">
          {castings.map((c) => (
            <Row
              key={c.id}
              href={`/castings/${c.id}`}
              logo={c.hostBrand}
              meta={`${c.followed ? "★ " : ""}${c.hostBrand.name} · ${c.stage === "open" ? t("Einreichen", "Submit") : t("Abstimmung", "Voting")} ${leftLabel(c.deadline, t)}${c.submissionCount > 0 ? ` · ${c.submissionCount} ${c.submissionCount === 1 ? t("Video", "video") : t("Videos", "videos")}` : ""}`}
              text={c.prompt}
            />
          ))}
        </ul>
      )}

      <h2 className="mb-2 text-sm font-semibold text-white">{t("Creator-Challenges", "Creator challenges")}</h2>
      {visibleChallenges.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("Gerade läuft keine Challenge.", "No challenge running right now.")}</p>
      ) : (
        <ul className="space-y-3">
          {visibleChallenges.map((c) => (
            <Row key={c.id} href={`/challenges/${c.id}`} logo={{ name: c.brandName, logoUrl: c.brandLogoUrl }} meta={`${followed.has(c.brandId) ? "★ " : ""}${c.brandName} · ${periodLabel(c.period)}`} text={c.prompt} />
          ))}
        </ul>
      )}
    </div>
  );
}
