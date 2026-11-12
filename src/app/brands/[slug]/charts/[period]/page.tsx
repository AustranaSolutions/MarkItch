import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { currentPeriod, periodLabel, getChartForBrand, getChartPeriodsForBrand } from "@/lib/creator-charts";
import { CreatorChartList } from "@/components/creator-charts/creator-chart-list";
import { getT, getLang } from "@/lib/lang";
import { langOf } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; period: string }> }): Promise<Metadata> {
  const { slug, period } = await params;
  const [brand] = await db.select({ name: brands.name }).from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) return {};
  return { title: `Creator-Charts: ${brand.name} (${periodLabel(period, await getLang())}) — MarkItch` };
}

/**
 * Phase 20: monthly leaderboard of creator-posted promo videos for one
 * brand — see src/lib/creator-charts.ts for why "period" (a plain
 * "YYYY-MM") needs no separate round-scheduling. Deliberately labeled as
 * community content, not brand-confirmed — see CLAUDE-CODE-UEBERGABE.md's
 * Ideen-Backlog for why that framing matters here.
 */
export default async function CreatorChartsPage({ params }: { params: Promise<{ slug: string; period: string }> }) {
  const t = await getT();
  const { slug, period } = await params;
  const [brand] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) notFound();

  const viewer = await getOptionalUser();
  const [{ entries, viewerVotedSubmissionId }, allPeriods, viewerBrand] = await Promise.all([
    getChartForBrand(brand.id, period, viewer?.id ?? null),
    getChartPeriodsForBrand(brand.id),
    viewer ? getBrandForUser(viewer.id) : Promise.resolve(null),
  ]);

  const isLive = period === currentPeriod();
  const isOwnBrand = viewerBrand?.id === brand.id;
  const isCompeting = viewerBrand ? entries.some((e) => e.creatorBrandId === viewerBrand.id) : false;
  const canVote = Boolean(viewer) && isLive && !isOwnBrand && !isCompeting;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <p className="mb-1 text-xs uppercase tracking-wide text-orange-500">Creator-Charts</p>
      <div className="mb-1 flex items-center gap-2">
        <Link href={`/brands/${brand.slug}`} className="text-lg font-bold text-white hover:underline">
          {brand.name}
        </Link>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
          {isLive ? t("Läuft", "Live") : t("Beendet", "Ended")}
        </span>
      </div>
      <p className="mb-4 text-sm text-zinc-400">{periodLabel(period, await getLang())}</p>
      <p className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
        {t(`Community-Inhalt — von Creatorn selbst gepostet, nicht notwendigerweise offiziell von ${brand.name} bestätigt.`, `Community content — posted by creators themselves, not necessarily officially confirmed by ${brand.name}.`)}
      </p>

      <CreatorChartList
        initialEntries={entries}
        initialViewerVotedSubmissionId={viewerVotedSubmissionId}
        isLoggedIn={Boolean(viewer)}
        canVote={canVote}
      />

      {allPeriods.length > 1 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-white">{t("Frühere Runden", "Previous rounds")}</h2>
          <ul className="flex flex-wrap gap-2">
            {allPeriods
              .filter((p) => p !== period)
              .map((p) => (
                <li key={p}>
                  <Link
                    href={`/brands/${brand.slug}/charts/${p}`}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-orange-400 hover:text-orange-400"
                  >
                    {periodLabel(p, langOf(t))}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
