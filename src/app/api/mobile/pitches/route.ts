import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getUpcomingBattles } from "@/lib/upcoming-battles";
import { getRemindedBattleIds } from "@/lib/reminder";
import { getLiveFeedDuels } from "@/lib/feed";

// RN-5: Pitches-Tab der App — dieselbe „kommt bald“-Liste wie /pitches im Web.
export async function GET() {
  const viewer = await getOptionalUser();
  const [upcoming, remindedIds, live] = await Promise.all([
    getUpcomingBattles(),
    viewer ? getRemindedBattleIds(viewer.id) : Promise.resolve([] as string[]),
    // Luca 26.10.: Reiter „Live“ (ältere App-Versionen ignorieren das Feld).
    getLiveFeedDuels(viewer?.id ?? null),
  ]);
  const reminded = new Set(remindedIds);
  const brand = (b: { name: string; slug: string; logoUrl: string | null }) => ({ name: b.name, slug: b.slug, logoUrl: b.logoUrl });

  return NextResponse.json({
    battles: upcoming.map(({ battle, deadline, waitingOnBrandIds }) => ({
      id: battle.id,
      category: battle.category,
      brandA: brand(battle.brandA),
      brandB: brand(battle.brandB),
      deadline: deadline?.toISOString() ?? null,
      // RN-7: welche Seite ihr Video schon hat (Luca: „ich sehe nicht, wann das ist“).
      videoReadyA: !waitingOnBrandIds.includes(battle.brandAId),
      videoReadyB: !waitingOnBrandIds.includes(battle.brandBId),
      reminded: reminded.has(battle.id),
    })),
    live,
  });
}
