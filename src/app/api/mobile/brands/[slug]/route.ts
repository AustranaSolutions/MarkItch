import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getBrandProfileExtras } from "@/lib/brand-profile";
import { getFollowerCount, getFollowingCountForBrand, isFollowing } from "@/lib/follow";
import { getFeedSoloPitchesForBrand, getFeedDuelsForBrand } from "@/lib/feed";
import { getBlockedIds } from "@/lib/block";

/**
 * RN-4: Markenprofil für die App — dieselben Daten wie die Seite
 * /brands/[slug] (und damit /profile für die eigene Marke), als JSON.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [brand] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Diese Marke gibt es nicht." }, { status: 404 });
  }

  const viewer = await getOptionalUser();
  const viewerBrand = viewer ? await getBrandForUser(viewer.id) : null;
  const isOwnBrand = viewerBrand?.id === brand.id;
  const [soloPitches, duels, followerCount, followingCount, viewerFollows, extras, blocked] = await Promise.all([
    getFeedSoloPitchesForBrand(viewer?.id ?? null, brand.id),
    getFeedDuelsForBrand(viewer?.id ?? null, brand.id),
    getFollowerCount(brand.id),
    getFollowingCountForBrand(brand.id),
    viewer && !isOwnBrand ? isFollowing(viewer.id, brand.id) : Promise.resolve(false),
    getBrandProfileExtras(brand, viewerBrand?.id ?? null, isOwnBrand),
    getBlockedIds(viewer?.id ?? null),
  ]);

  return NextResponse.json({
    brand: {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      logoUrl: brand.logoUrl,
      description: brand.description,
    },
    isOwnBrand,
    viewerFollows,
    followerCount,
    followingCount,
    soloPitches,
    duels,
    info: {
      category: extras.category,
      country: extras.country,
      website: extras.website,
      period: extras.period,
      periodLabel: extras.periodLabel,
      chartCount: extras.chartEntries.length,
      activeCasting: extras.activeCasting ? { id: extras.activeCasting.id, prompt: extras.activeCasting.prompt } : null,
      castingWinner: extras.castingWinner,
      latestFinishedCastingId: extras.latestFinishedCastingId,
    },
    // RN-5b: offene Einladung zwischen eigener und dieser Marke (für den „Duell einladen“-Knopf).
    viewerHasBrand: Boolean(viewerBrand),
    // RN-7: Videos/Duelle sind dann schon leer (Feed-Filter), die App zeigt „Blockiert".
    viewerBlocked: blocked.brandIds.has(brand.id),
    livePendingChallenge: extras.livePending
      ? { sentByViewer: extras.livePending.challengerBrandId === viewerBrand?.id }
      : null,
  });
}
