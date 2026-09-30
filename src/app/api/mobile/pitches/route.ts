import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getUpcomingBattles } from "@/lib/upcoming-battles";
import { getRemindedBattleIds } from "@/lib/reminder";

// RN-5: Pitches-Tab der App — dieselbe „kommt bald“-Liste wie /pitches im Web.
export async function GET() {
  const viewer = await getOptionalUser();
  const [upcoming, remindedIds] = await Promise.all([
    getUpcomingBattles(),
    viewer ? getRemindedBattleIds(viewer.id) : Promise.resolve([] as string[]),
  ]);
  const reminded = new Set(remindedIds);
  const brand = (b: { name: string; slug: string; logoUrl: string | null }) => ({ name: b.name, slug: b.slug, logoUrl: b.logoUrl });

  return NextResponse.json({
    battles: upcoming.map(({ battle, deadline }) => ({
      id: battle.id,
      category: battle.category,
      brandA: brand(battle.brandA),
      brandB: brand(battle.brandB),
      deadline: deadline?.toISOString() ?? null,
      reminded: reminded.has(battle.id),
    })),
  });
}
