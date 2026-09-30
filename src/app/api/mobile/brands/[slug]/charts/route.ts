import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { currentPeriod, periodLabel, getChartForBrand, getChartPeriodsForBrand } from "@/lib/creator-charts";

const PERIOD_RE = /^\d{4}-\d{2}$/;

/**
 * RN-5d: Creator-Charts einer Marke für einen Monat (`?period=YYYY-MM`,
 * ohne = laufender Monat) — dieselben Daten und Abstimm-Regeln wie
 * /brands/[slug]/charts/[period]. Abstimmen über /api/creator-charts/vote.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const requested = request.nextUrl.searchParams.get("period");
  const period = requested && PERIOD_RE.test(requested) ? requested : currentPeriod();
  const [brand] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) return NextResponse.json({ error: "Diese Marke gibt es nicht." }, { status: 404 });

  const viewer = await getOptionalUser();
  const [{ entries, viewerVotedSubmissionId }, allPeriods, viewerBrand] = await Promise.all([
    getChartForBrand(brand.id, period, viewer?.id ?? null),
    getChartPeriodsForBrand(brand.id),
    viewer ? getBrandForUser(viewer.id) : Promise.resolve(null),
  ]);
  const isLive = period === currentPeriod();
  const isOwnBrand = viewerBrand?.id === brand.id;
  const isCompeting = viewerBrand ? entries.some((e) => e.creatorBrandId === viewerBrand.id) : false;

  return NextResponse.json({
    brand: { id: brand.id, name: brand.name, slug: brand.slug },
    period,
    periodLabel: periodLabel(period),
    isLive,
    entries,
    viewerVotedSubmissionId,
    canVote: Boolean(viewer) && isLive && !isOwnBrand && !isCompeting,
    otherPeriods: allPeriods.filter((p) => p !== period).map((p) => ({ period: p, label: periodLabel(p) })),
  });
}
