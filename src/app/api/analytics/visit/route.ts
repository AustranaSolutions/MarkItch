import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { recordVisitorEvent, type VisitorEventKind } from "@/lib/analytics";
import { apiError } from "@/lib/api-error";

const VALID_KINDS: VisitorEventKind[] = ["session_start", "register_started"];

/** Same "open to anyone, not rate-limited" reasoning as /api/analytics/track — see that route's comment. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const anonId = body?.anonId;
  const kind = body?.kind;
  const ref = typeof body?.ref === "string" && body.ref ? body.ref.slice(0, 200) : null;
  if (typeof anonId !== "string" || !anonId || !VALID_KINDS.includes(kind)) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const viewer = await getOptionalUser();
  await recordVisitorEvent(anonId, kind as VisitorEventKind, { userId: viewer?.id ?? null, ref });
  return NextResponse.json({ ok: true });
}
