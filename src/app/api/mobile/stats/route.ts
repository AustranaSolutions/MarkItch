import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getBrandAnalyticsSummary, getBrandContentBreakdown } from "@/lib/analytics";
import { unauthorized } from "@/lib/mobile-auth";
import { getMarkItchScoreSafe } from "@/lib/markitch-score";
import { apiError } from "@/lib/api-error";

// Phase F: Statistik der eigenen Marke für die App — dieselben Zahlen wie
// /dashboard im Web. Jede Marke sieht nur ihre eigenen.
export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const brand = await getBrandForUser(viewer.id);
  if (!brand) return await apiError({ error: "Nur für Marken-Konten." }, { status: 403 });
  const [summary, items, score] = await Promise.all([
    getBrandAnalyticsSummary(brand.id),
    getBrandContentBreakdown(brand.id),
    getMarkItchScoreSafe(brand.id),
  ]);
  return NextResponse.json({ brandName: brand.name, summary, items, score });
}
