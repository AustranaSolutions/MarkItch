import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, seenContent } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { recordAnalyticsEvents, type AnalyticsEventInput, type AnalyticsEventKind } from "@/lib/analytics";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";

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
// Luca 13.11.: "complete" = bis (90 %) zum Ende angesehen — Grundlage fürs Feed-Ranking.
const VALID_KINDS: AnalyticsEventKind[] = ["view", "share", "cta_click", "vote_click", "login_required", "complete"];

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
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const brandIds: string[] = [...new Set(events.map((e: AnalyticsEventInput) => e.brandId))];
  const validBrands = await db.select({ id: brands.id }).from(brands).where(inArray(brands.id, brandIds));
  const validBrandIds = new Set(validBrands.map((b) => b.id));
  const validEvents = events.filter((e: AnalyticsEventInput) => validBrandIds.has(e.brandId));
  if (validEvents.length === 0) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  await recordAnalyticsEvents(validEvents);

  // Luca 13.11. (Phase 6): angemeldet → „schon gesehen“ fürs Feed-Ranking merken.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const seenMap = new Map<string, { targetType: string; targetId: string }>();
  for (const e of validEvents) {
    if (e.kind !== "view") continue;
    const target = e.soloPitchId ? { targetType: "pitch", targetId: e.soloPitchId } : e.battleId ? { targetType: "battle", targetId: e.battleId } : null;
    // Doppelte im selben Bündel würden ON CONFLICT zweimal treffen.
    if (target && UUID_RE.test(target.targetId)) seenMap.set(`${target.targetType}:${target.targetId}`, target);
  }
  const seen = [...seenMap.values()];
  if (seen.length > 0) {
    const viewer = await getOptionalUser().catch(() => null);
    if (viewer) {
      await db
        .insert(seenContent)
        .values(seen.map((s) => ({ ...s, userId: viewer.id })))
        .onConflictDoUpdate({
          target: [seenContent.userId, seenContent.targetType, seenContent.targetId],
          set: { seenAt: new Date() },
        })
        .catch(() => {});
    }
  }
  return NextResponse.json({ ok: true });
}
