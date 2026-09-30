import { NextResponse } from "next/server";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, partnerCastings } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getFollowedBrandIds } from "@/lib/follow";
import { getRunningChallengesForBrands } from "@/lib/creator-challenge";
import { periodLabel } from "@/lib/creator-charts";

/**
 * RN-7 (Luca 30.09.): Suche-Tab „Mitmachen“ — laufende Partner-Castings und
 * Creator-Challenges der Marken, denen man folgt, damit man nicht jedes
 * Profil einzeln öffnen muss.
 */
export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return NextResponse.json({ castings: [], challenges: [], followsAnyone: false });
  const followed = await getFollowedBrandIds(viewer.id);
  if (followed.length === 0) return NextResponse.json({ castings: [], challenges: [], followsAnyone: false });

  const [castings, challenges] = await Promise.all([
    db
      .select({
        id: partnerCastings.id,
        prompt: partnerCastings.prompt,
        submissionDeadline: partnerCastings.submissionDeadline,
        votingEndsAt: partnerCastings.votingEndsAt,
        brandName: brands.name,
        brandSlug: brands.slug,
        brandLogoUrl: brands.logoUrl,
      })
      .from(partnerCastings)
      .innerJoin(brands, eq(partnerCastings.hostBrandId, brands.id))
      .where(and(inArray(partnerCastings.hostBrandId, followed), gt(partnerCastings.votingEndsAt, new Date()))),
    getRunningChallengesForBrands(followed),
  ]);

  return NextResponse.json({
    followsAnyone: true,
    castings: castings.map((c) => ({
      id: c.id,
      prompt: c.prompt,
      brandName: c.brandName,
      brandSlug: c.brandSlug,
      brandLogoUrl: c.brandLogoUrl,
      open: c.submissionDeadline.getTime() > Date.now(),
      deadline: (c.submissionDeadline.getTime() > Date.now() ? c.submissionDeadline : c.votingEndsAt).toISOString(),
    })),
    challenges: challenges.map((c) => ({ ...c, periodLabel: periodLabel(c.period) })),
  });
}
