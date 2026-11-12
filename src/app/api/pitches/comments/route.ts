import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { soloPitches, comments } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { checkComment } from "@/lib/comment-filter";
import { getCommentsForSoloPitch } from "@/lib/comment";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";
import { apiError } from "@/lib/api-error";

/** Same as /api/feed/comments, keyed on a solo pitch instead of a battle. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const soloPitchId = searchParams.get("soloPitchId");
  if (!soloPitchId) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const viewer = await getOptionalUser();
  const list = await getCommentsForSoloPitch(soloPitchId, viewer?.id ?? null);
  return NextResponse.json({ comments: list });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const soloPitchId = body?.soloPitchId;
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const [pitch] = await db.select({ id: soloPitches.id, brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch) {
    return await apiError({ error: "Dieser Pitch existiert nicht." }, { status: 404 });
  }

  // Phase F: Kommentarfilter (Wortliste, Links, Doppelposts, Limit).
  const checked = await checkComment(viewer.id, body?.content);
  if (!checked.ok) {
    return await apiError({ error: checked.error }, { status: 400 });
  }
  const content = checked.content;
  await db.insert(comments).values({ soloPitchId, userId: viewer.id, content });
  const [memberIds, actor] = await Promise.all([getBrandMemberUserIds(pitch.brandId), getActorLabel(viewer.id)]);
  await notifyUsers(memberIds, { de: `${actor.label} hat eine Meinung zu deinem Video geschrieben.`, en: `${actor.label} commented on your video.` }, `/?pitch=${soloPitchId}`, viewer.id);
  const list = await getCommentsForSoloPitch(soloPitchId, viewer.id);
  return NextResponse.json({ comments: list });
}
