import { NextRequest, NextResponse } from "next/server";
import { isUuid, readJsonBody } from "@/lib/mobile-auth";
import { requireMobileAdmin } from "@/lib/mobile-admin";
import { apiError } from "@/lib/api-error";
import { createDuelPoll, deleteDuelPoll, listDuelPollsForAdmin, parseDuelPollInput, setDuelPollStatus, setPollOptionSaved } from "@/lib/duel-poll";

// Luca 17.11. (5.5): Duell-Umfragen im Admin-Bereich der App. Nur ADMIN_EMAILS.

export async function GET() {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const polls = await listDuelPollsForAdmin();
  return NextResponse.json({
    polls: polls.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), closedAt: p.closedAt?.toISOString() ?? null })),
  });
}

/**
 * Body:
 * - `{ action: "create", title?, pairs: [[brandAId, brandBId], …] }`
 * - `{ action: "close" | "reopen" | "delete", pollId }`
 * - `{ action: "save", optionId, saved }` — Paarung „für später“ merken
 */
export async function POST(request: NextRequest) {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const body = await readJsonBody(request);
  const bad = () => apiError({ error: "Ungültige Anfrage." }, { status: 400 });

  if (body.action === "create") {
    const parsed = parseDuelPollInput(body.title, body.pairs);
    if ("error" in parsed) return await apiError({ error: parsed.error }, { status: 400 });
    if (!parsed.pairs.flat().every(isUuid)) return await bad();
    const result = await createDuelPoll(parsed.title, parsed.pairs);
    if (result.error) return await apiError({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, id: result.id });
  }
  if (body.action === "close" || body.action === "reopen" || body.action === "delete") {
    if (typeof body.pollId !== "string" || !isUuid(body.pollId)) return await bad();
    if (body.action === "delete") await deleteDuelPoll(body.pollId);
    else await setDuelPollStatus(body.pollId, body.action === "close" ? "closed" : "open");
    return NextResponse.json({ ok: true });
  }
  if (body.action === "save") {
    if (typeof body.optionId !== "string" || !isUuid(body.optionId) || typeof body.saved !== "boolean") return await bad();
    await setPollOptionSaved(body.optionId, body.saved);
    return NextResponse.json({ ok: true });
  }
  return await bad();
}
