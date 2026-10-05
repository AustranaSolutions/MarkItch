import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles, comments } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { checkComment } from "@/lib/comment-filter";
import { getCommentsForBattle } from "@/lib/comment";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";

/** Load a battle's comment thread — used to open the feed's comment sheet. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const battleId = searchParams.get("battleId");
  if (!battleId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const viewer = await getOptionalUser();
  const list = await getCommentsForBattle(battleId, viewer?.id ?? null);
  return NextResponse.json({ comments: list });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const battleId = body?.battleId;
  if (typeof battleId !== "string" || !battleId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const [battle] = await db
    .select({ id: battles.id, brandAId: battles.brandAId, brandBId: battles.brandBId })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);
  if (!battle) {
    return NextResponse.json({ error: "Dieser Pitch existiert nicht." }, { status: 404 });
  }

  // Phase F: Kommentarfilter (Wortliste, Links, Doppelposts, Limit).
  const checked = await checkComment(viewer.id, body?.content);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }
  const content = checked.content;
  await db.insert(comments).values({ battleId, userId: viewer.id, content });
  const [memberIdsA, memberIdsB, actor] = await Promise.all([
    getBrandMemberUserIds(battle.brandAId),
    getBrandMemberUserIds(battle.brandBId),
    getActorLabel(viewer.id),
  ]);
  await notifyUsers([...memberIdsA, ...memberIdsB], `${actor.label} hat dein Duell kommentiert.`, `/?battle=${battleId}`, viewer.id);
  const list = await getCommentsForBattle(battleId, viewer.id);
  return NextResponse.json({ comments: list });
}
