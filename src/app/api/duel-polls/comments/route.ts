import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, duelPolls } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { checkComment } from "@/lib/comment-filter";
import { getCommentsForPoll, resolveReplyParent } from "@/lib/comment";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { isUuid } from "@/lib/mobile-auth";
import { apiError } from "@/lib/api-error";

// Luca 17.11. (5.5): Meinungen zu einer Duell-Umfrage — z. B. „lieber Marke X“.
// Gleiches Muster wie /api/pitches/reaction-comments.

export async function GET(request: NextRequest) {
  const pollId = new URL(request.url).searchParams.get("pollId");
  if (!pollId || !isUuid(pollId)) return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  const viewer = await getOptionalUser();
  return NextResponse.json({ comments: await getCommentsForPoll(pollId, viewer?.id ?? null) });
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const pollId = body?.pollId;
  if (typeof pollId !== "string" || !isUuid(pollId)) return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  const [poll] = await db.select({ id: duelPolls.id }).from(duelPolls).where(eq(duelPolls.id, pollId)).limit(1);
  if (!poll) return await apiError({ error: "Diese Umfrage gibt es nicht mehr." }, { status: 404 });

  const checked = await checkComment(viewer.id, body?.content);
  if (!checked.ok) return await apiError({ error: checked.error }, { status: 400 });
  const reply = await resolveReplyParent(body?.parentId, { pollId });
  if (!reply.ok) return await apiError({ error: reply.error }, { status: 400 });
  await db.insert(comments).values({ pollId, userId: viewer.id, content: checked.content, parentId: reply.parentId });
  if (reply.parentAuthorId) {
    const actor = await getActorLabel(viewer.id);
    await notifyUsers([reply.parentAuthorId], { de: `${actor.label} hat auf deine Meinung geantwortet.`, en: `${actor.label} replied to your comment.` }, `/pitches?tab=polls`, viewer.id, "comment");
  }
  return NextResponse.json({ comments: await getCommentsForPoll(pollId, viewer.id) });
}
