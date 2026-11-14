import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { getBrandForUser } from "@/lib/brand";
import { getVerificationStatus, requestVerification } from "@/lib/brand-trust";
import { apiError } from "@/lib/api-error";

// Luca 13.11. (Phase 4): Prüfung per Code. GET = Status + Code der eigenen
// Marke, POST `{ url }` = Prüfung beantragen (Code steht unter diesem Link).

export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const brand = await getBrandForUser(viewer.id);
  if (!brand) return await apiError({ error: "Du hast keine Marke." }, { status: 404 });
  return NextResponse.json(await getVerificationStatus(brand.id));
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const brand = await getBrandForUser(viewer.id);
  if (!brand) return await apiError({ error: "Du hast keine Marke." }, { status: 404 });
  const body = await readJsonBody(request);
  const result = await requestVerification(brand.id, body.url);
  if (!result.ok) return await apiError({ error: result.error }, { status: 400 });
  return NextResponse.json(await getVerificationStatus(brand.id));
}
