import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { castDuelPollVote, getOpenDuelPolls } from "@/lib/duel-poll";
import { isUuid, readJsonBody } from "@/lib/mobile-auth";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";

// Luca 17.11. (5.5): Duell-Umfragen für App und Web. Ohne Konto schickt das
// Gerät seine zufällige Kennung im Header `x-guest-id` (nicht in der URL).

export async function GET(request: NextRequest) {
  const viewer = await getOptionalUser();
  const polls = await getOpenDuelPolls(viewer?.id ?? null, request.headers.get("x-guest-id"));
  return NextResponse.json({ polls });
}

/** Body: `{ pollId, optionId, guestId? }` */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  const body = await readJsonBody(request);
  const { allowed } = await checkRateLimit(viewer ? "vote" : "guest-vote", await getClientIp(request));
  if (!allowed) return await apiError({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  if (typeof body.pollId !== "string" || typeof body.optionId !== "string" || !isUuid(body.pollId) || !isUuid(body.optionId)) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const result = await castDuelPollVote(body.pollId, body.optionId, viewer?.id ?? null, body.guestId);
  if (result.error) return await apiError({ error: result.error }, { status: viewer || result.error !== "Bitte melde dich an." ? 400 : 401 });
  const polls = await getOpenDuelPolls(viewer?.id ?? null, body.guestId);
  return NextResponse.json({ poll: polls.find((p) => p.id === body.pollId) ?? null });
}
