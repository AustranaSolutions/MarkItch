import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { recordAnalyticsEvents, type AnalyticsEventInput, type AnalyticsEventKind } from "@/lib/analytics";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * View/share tracking — deliberately open to anyone, logged-in or not (a
 * view happens just by scrolling past a video, no account needed). Low
 * stakes if gamed (a few inflated view counts, not a vote or a Duell
 * outcome). Seit dem Audit 04.10. (M8) trotzdem pro IP begrenzt: genau
 * diese Zahlen sollen Marken später bezahlen, und jedes Bündel ist Schreiblast.
 *
 * Phase 48: nimmt jetzt ein Bündel `{ events: [...] }` entgegen (siehe
 * analytics-client.ts) statt eines einzelnen Events — eine Validierungs-Query
 * für alle beteiligten Marken zusammen, ein Insert für alle Events zusammen.
 */
const VALID_KINDS: AnalyticsEventKind[] = ["view", "share", "cta_click", "vote_click", "login_required"];

function parseEvent(raw: unknown): AnalyticsEventInput | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const brandId = body.brandId;
  const kind = body.kind;
  if (typeof brandId !== "string" || !brandId || !VALID_KINDS.includes(kind as AnalyticsEventKind)) return null;
  return {
    brandId,
    kind: kind as AnalyticsEventKind,
    soloPitchId: typeof body.soloPitchId === "string" ? body.soloPitchId : undefined,
    battleId: typeof body.battleId === "string" ? body.battleId : undefined,
    anonId: typeof body.anonId === "string" && body.anonId ? body.anonId : undefined,
  };
}

export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit("analytics", await getClientIp(request));
  // Still verwerfen — der Client wiederholt nicht und braucht keine Fehlermeldung.
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const body = await request.json().catch(() => null);
  const rawEvents: unknown[] = Array.isArray(body?.events) ? body.events : [body];
  const events: AnalyticsEventInput[] = rawEvents
    .map((raw) => parseEvent(raw))
    .filter((e): e is AnalyticsEventInput => e !== null)
    .slice(0, 20);
  if (events.length === 0) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const brandIds: string[] = [...new Set(events.map((e: AnalyticsEventInput) => e.brandId))];
  const validBrands = await db.select({ id: brands.id }).from(brands).where(inArray(brands.id, brandIds));
  const validBrandIds = new Set(validBrands.map((b) => b.id));
  const validEvents = events.filter((e: AnalyticsEventInput) => validBrandIds.has(e.brandId));
  if (validEvents.length === 0) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  await recordAnalyticsEvents(validEvents);
  return NextResponse.json({ ok: true });
}
