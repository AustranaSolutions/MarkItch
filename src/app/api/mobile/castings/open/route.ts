import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBlockedIds } from "@/lib/block";
import { getOpenCastings } from "@/lib/casting";
import { getAllRunningChallenges } from "@/lib/creator-challenge";
import { periodLabel } from "@/lib/creator-charts";
import { getFollowedBrandIds } from "@/lib/follow";

// Luca 17.11. (Phasen-Map 4.3): alle laufenden Partner-Castings und (18.11.)
// Creator-Challenges für die App-Liste „Castings & Challenges“.
export async function GET() {
  const viewer = await getOptionalUser();
  const [blocked, followedIds] = await Promise.all([getBlockedIds(viewer?.id ?? null), viewer ? getFollowedBrandIds(viewer.id) : Promise.resolve([] as string[])]);
  const followed = new Set(followedIds);
  const [castings, challenges] = await Promise.all([getOpenCastings(blocked.brandIds, followed), getAllRunningChallenges(followedIds)]);
  // Luca 18.11.: Zahl am Eingang nur für Marken, denen man folgt (bei vielen Marken sonst riesig).
  const visibleChallenges = challenges
    .filter((c) => !blocked.brandIds.has(c.brandId))
    .map((c) => ({ ...c, followed: followed.has(c.brandId) }))
    .sort((a, b) => Number(b.followed) - Number(a.followed))
    .slice(0, 50);
  return NextResponse.json({
    castings: castings.map((c) => ({ ...c, deadline: c.deadline.toISOString(), submissionDeadline: c.submissionDeadline.toISOString() })),
    challenges: visibleChallenges.map((c) => ({
      id: c.id,
      prompt: c.prompt,
      periodLabel: periodLabel(c.period),
      followed: c.followed,
      brand: { id: c.brandId, name: c.brandName, slug: c.brandSlug, logoUrl: c.brandLogoUrl },
    })),
    followedCount: castings.filter((c) => c.followed).length + visibleChallenges.filter((c) => c.followed).length,
  });
}
