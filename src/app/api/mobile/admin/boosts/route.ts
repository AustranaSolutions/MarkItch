import { NextRequest, NextResponse } from "next/server";
import { activateBoost, getActiveBoosts, getPendingBoosts, rejectBoost } from "@/lib/boost";
import { isUuid, readJsonBody } from "@/lib/mobile-auth";
import { requireMobileAdmin } from "@/lib/mobile-admin";

// Luca 11.10.: Boost-Anfragen in der App — wie /admin/boosts (Zahlung läuft außerhalb, hier nur freischalten).

export async function GET() {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const [pending, active] = await Promise.all([getPendingBoosts(), getActiveBoosts()]);
  return NextResponse.json({
    pending: pending.map((b) => ({ ...b, requestedAt: b.requestedAt.toISOString() })),
    active: active.map((b) => ({ ...b, expiresAt: b.expiresAt.toISOString() })),
  });
}

/** Body: `{ action: "activate" | "reject", boostId }` */
export async function POST(request: NextRequest) {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const body = await readJsonBody(request);
  if (typeof body.boostId !== "string" || !isUuid(body.boostId)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (body.action === "activate") await activateBoost(body.boostId);
  else if (body.action === "reject") await rejectBoost(body.boostId);
  else return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
