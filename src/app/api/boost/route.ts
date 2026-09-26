import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { soloPitches } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getBoostForSoloPitch, requestBoost, BOOST_PRICE_CENTS, BOOST_DURATION_MS } from "@/lib/boost";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { BOOST_ENABLED } from "@/lib/feature-flags";

/** Current boost status for one of the viewer's own Solo-Pitches — used by BoostButton when its sheet opens. */
export async function GET(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }
  const soloPitchId = request.nextUrl.searchParams.get("soloPitchId");
  if (!soloPitchId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const myBrand = await getBrandForUser(viewer.id);
  const [pitch] = await db.select({ brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!myBrand || !pitch || pitch.brandId !== myBrand.id) {
    return NextResponse.json({ error: "Das ist nicht dein Pitch." }, { status: 403 });
  }

  const boost = await getBoostForSoloPitch(soloPitchId);
  return NextResponse.json({
    boost,
    priceCents: BOOST_PRICE_CENTS,
    durationHours: BOOST_DURATION_MS / (60 * 60 * 1000),
  });
}

export async function POST(request: NextRequest) {
  // Phase 48: Boost pausiert, bis wir monetarisieren wollen — siehe feature-flags.ts.
  if (!BOOST_ENABLED) {
    return NextResponse.json({ error: "Boost ist aktuell nicht verfügbar." }, { status: 403 });
  }

  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const myBrand = await getBrandForUser(viewer.id);
  if (!myBrand) {
    return NextResponse.json({ error: "Du brauchst eine Marke, um einen Boost anzufragen." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit("boost-request", myBrand.id);
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const soloPitchId = body?.soloPitchId;
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = await requestBoost(myBrand.id, soloPitchId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
