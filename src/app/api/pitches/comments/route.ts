import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { soloPitches, comments } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getCommentsForSoloPitch } from "@/lib/comment";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";

const MAX_COMMENT_LENGTH = 500;

/** Same as /api/feed/comments, keyed on a solo pitch instead of a battle. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const soloPitchId = searchParams.get("soloPitchId");
  if (!soloPitchId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const viewer = await getOptionalUser();
  const list = await getCommentsForSoloPitch(soloPitchId, viewer?.id ?? null);
  return NextResponse.json({ comments: list });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const soloPitchId = body?.soloPitchId;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Kommentar darf nicht leer sein." }, { status: 400 });
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Kommentar darf maximal ${MAX_COMMENT_LENGTH} Zeichen lang sein.` },
      { status: 400 },
    );
  }

  const [pitch] = await db.select({ id: soloPitches.id, brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch) {
    return NextResponse.json({ error: "Dieser Pitch existiert nicht." }, { status: 404 });
  }

  await db.insert(comments).values({ soloPitchId, userId: viewer.id, content });
  const [memberIds, actor] = await Promise.all([getBrandMemberUserIds(pitch.brandId), getActorLabel(viewer.id)]);
  await notifyUsers(memberIds, `${actor.label} hat deinen Pitch kommentiert.`, `/?pitch=${soloPitchId}`, viewer.id);
  const list = await getCommentsForSoloPitch(soloPitchId, viewer.id);
  return NextResponse.json({ comments: list });
}
