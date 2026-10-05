import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { soloPitches, reactions } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { toggleSoloPitchLikeForUser, toggleReactionLikeForUser } from "@/lib/like";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";

/** Like toggle for a solo pitch or a reaction — see /api/feed/like for the battle-side equivalent. */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const { allowed } = await checkRateLimit("like", viewer.id);
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const soloPitchId = body?.soloPitchId;
  const reactionId = body?.reactionId;

  if (typeof soloPitchId === "string" && soloPitchId) {
    const [pitch] = await db.select({ brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
    if (!pitch) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    const result = await toggleSoloPitchLikeForUser(viewer.id, soloPitchId, pitch.brandId);
    if (result.liked) {
      const [memberIds, actor] = await Promise.all([getBrandMemberUserIds(pitch.brandId), getActorLabel(viewer.id)]);
      await notifyUsers(memberIds, `${actor.label} gefällt dein Pitch.`, `/?pitch=${soloPitchId}`, viewer.id);
    }
    return NextResponse.json(result);
  }

  if (typeof reactionId === "string" && reactionId) {
    const [reaction] = await db
      .select({ brandId: reactions.brandId, userId: reactions.userId, soloPitchId: reactions.soloPitchId })
      .from(reactions)
      .where(eq(reactions.id, reactionId))
      .limit(1);
    if (!reaction) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    const result = await toggleReactionLikeForUser(viewer.id, reactionId, reaction.brandId);
    if (result.liked) {
      // Phase E: Community-Reaktion → das Zuschauer-Konto selbst benachrichtigen.
      const [memberIds, actor] = await Promise.all([
        reaction.brandId ? getBrandMemberUserIds(reaction.brandId) : Promise.resolve(reaction.userId ? [reaction.userId] : []),
        getActorLabel(viewer.id),
      ]);
      await notifyUsers(memberIds, `${actor.label} gefällt deine Reaktion.`, `/?pitch=${reaction.soloPitchId}`, viewer.id);
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
}
