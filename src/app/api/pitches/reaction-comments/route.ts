import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reactions, comments } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { checkComment } from "@/lib/comment-filter";
import { getCommentsForReaction } from "@/lib/comment";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";
import { apiError } from "@/lib/api-error";

/** Same as /api/pitches/comments, keyed on a reaction instead of a solo pitch. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reactionId = searchParams.get("reactionId");
  if (!reactionId) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const viewer = await getOptionalUser();
  const list = await getCommentsForReaction(reactionId, viewer?.id ?? null);
  return NextResponse.json({ comments: list });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const reactionId = body?.reactionId;
  if (typeof reactionId !== "string" || !reactionId) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const [reaction] = await db
    .select({ id: reactions.id, brandId: reactions.brandId, userId: reactions.userId, soloPitchId: reactions.soloPitchId, creatorChallengeId: reactions.creatorChallengeId })
    .from(reactions)
    .where(eq(reactions.id, reactionId))
    .limit(1);
  if (!reaction) {
    return await apiError({ error: "Diese Reaktion existiert nicht." }, { status: 404 });
  }

  // Phase F: Kommentarfilter (Wortliste, Links, Doppelposts, Limit).
  const checked = await checkComment(viewer.id, body?.content);
  if (!checked.ok) {
    return await apiError({ error: checked.error }, { status: 400 });
  }
  const content = checked.content;
  await db.insert(comments).values({ reactionId, userId: viewer.id, content });
  const [memberIds, actor] = await Promise.all([
    reaction.brandId ? getBrandMemberUserIds(reaction.brandId) : Promise.resolve(reaction.userId ? [reaction.userId] : []),
    getActorLabel(viewer.id),
  ]);
  // No dedicated reaction deep-link exists yet — points at the pitch the
  // reaction belongs to instead of a dead link.
  await notifyUsers(memberIds, { de: `${actor.label} hat eine Meinung zu deiner Reaktion geschrieben.`, en: `${actor.label} commented on your reaction.` }, reaction.soloPitchId ? `/?pitch=${reaction.soloPitchId}` : `/challenges/${reaction.creatorChallengeId}`, viewer.id);
  const list = await getCommentsForReaction(reactionId, viewer.id);
  return NextResponse.json({ comments: list });
}
