import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBlockedIds } from "@/lib/block";
import { getOpenCastings } from "@/lib/casting";
import { getAllRunningChallenges } from "@/lib/creator-challenge";
import { periodLabel } from "@/lib/creator-charts";

// Luca 17.11. (Phasen-Map 4.3): alle laufenden Partner-Castings und (18.11.)
// Creator-Challenges für die App-Liste „Castings & Challenges“.
export async function GET() {
  const viewer = await getOptionalUser();
  const blocked = await getBlockedIds(viewer?.id ?? null);
  const [castings, challenges] = await Promise.all([getOpenCastings(blocked.brandIds), getAllRunningChallenges()]);
  return NextResponse.json({
    castings: castings.map((c) => ({ ...c, deadline: c.deadline.toISOString(), submissionDeadline: c.submissionDeadline.toISOString() })),
    challenges: challenges
      .filter((c) => !blocked.brandIds.has(c.brandId))
      .map((c) => ({ id: c.id, prompt: c.prompt, periodLabel: periodLabel(c.period), brand: { id: c.brandId, name: c.brandName, slug: c.brandSlug, logoUrl: c.brandLogoUrl } })),
  });
}
