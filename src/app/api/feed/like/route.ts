import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getLikeCount, toggleLikeForUser } from "@/lib/like";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const { allowed } = await checkRateLimit("like", viewer.id);
  if (!allowed) {
    return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const battleId = body?.battleId;
  const brandId = body?.brandId;
  if (typeof battleId !== "string" || typeof brandId !== "string" || !battleId || !brandId) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId)).limit(1);
  if (!battle || (brandId !== battle.brandAId && brandId !== battle.brandBId)) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { liked } = await toggleLikeForUser(viewer.id, battleId, brandId);
  const count = await getLikeCount(battleId, brandId);
  if (liked) {
    const [memberIds, actor] = await Promise.all([getBrandMemberUserIds(brandId), getActorLabel(viewer.id)]);
    await notifyUsers(memberIds, { de: `${actor.label} gefällt deine Duell-Seite.`, en: `${actor.label} likes your side of the duel.` }, `/?battle=${battleId}`, viewer.id);
  }
  return NextResponse.json({ liked, count });
}
