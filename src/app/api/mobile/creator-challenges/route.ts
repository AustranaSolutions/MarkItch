import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { periodLabel } from "@/lib/creator-charts";
import { challengeStage, getOpenChallengesForBrand, openChallengeFor, openablePeriods } from "@/lib/creator-challenge";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-7: Creator-Challenge eröffnen (nur die Marke selbst). GET liefert die
// wählbaren Monate und die eigenen laufenden/kommenden Challenges fürs „+“.
export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const brand = await getBrandForUser(viewer.id);
  const own = brand ? await getOpenChallengesForBrand(brand.id) : [];
  const taken = new Set(own.map((c) => c.period));
  return NextResponse.json({
    periods: openablePeriods().map((p) => ({ ...p, taken: taken.has(p.period) })),
    own: own.map((c) => ({ id: c.id, prompt: c.prompt, periodLabel: periodLabel(c.period), stage: challengeStage(c.period) })),
  });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  const result = await openChallengeFor(viewer, { period: body.period, prompt: body.prompt });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ challengeId: result.challengeId }, { status: 201 });
}
