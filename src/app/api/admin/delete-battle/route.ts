import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { battles, brands } from "@/db/schema";
import { checkAdminKey } from "@/lib/admin-key";
import { isUuid } from "@/lib/mobile-auth";

// Luca 23.10.: ein einzelnes Duell gezielt per ID löschen (z. B. alte
// Testduelle wie „Live P7 A vs Live P7 B“). Ohne `confirm: true` wird nur
// angezeigt, welches Duell es wäre — nichts wird gelöscht. Abhängige Zeilen
// (Stimmen, Likes, Meinungen …) fallen per ON DELETE CASCADE mit weg.
//
// POST mit Header x-admin-key, Body {"battleId": "…"} bzw. {"battleId": "…", "confirm": true}.
export async function POST(request: NextRequest) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const battleId = typeof body?.battleId === "string" ? body.battleId : "";
  if (!isUuid(battleId)) return NextResponse.json({ error: "battleId fehlt oder ist ungültig." }, { status: 400 });

  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId)).limit(1);
  if (!battle) return NextResponse.json({ error: "Duell nicht gefunden." }, { status: 404 });

  const sides = await db
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .where(inArray(brands.id, [battle.brandAId, battle.brandBId]));
  const names = [battle.brandAId, battle.brandBId].map((id) => sides.find((s) => s.id === id)?.name ?? id);

  if (body?.confirm !== true) {
    return NextResponse.json({ dryRun: true, battleId, duel: `${names[0]} vs. ${names[1]}` });
  }

  await db.delete(battles).where(eq(battles.id, battleId));
  return NextResponse.json({ deleted: true, battleId, duel: `${names[0]} vs. ${names[1]}` });
}
