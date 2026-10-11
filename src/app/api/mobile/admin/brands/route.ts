import { NextRequest, NextResponse } from "next/server";
import { listBrandsForAdmin, setBrandVerified } from "@/lib/brand-verify";
import { isUuid, readJsonBody } from "@/lib/mobile-auth";
import { requireMobileAdmin } from "@/lib/mobile-admin";

// Luca 11.10.: Marken verifizieren direkt in der App (vorher nur über die
// Website /admin/brands, im In-App-Browser ohne Login). Nur ADMIN_EMAILS.

export async function GET() {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const brands = await listBrandsForAdmin();
  return NextResponse.json({
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      website: b.website,
      createdAt: b.createdAt.toISOString(),
      verified: b.verifiedAt !== null,
      ownerEmails: b.ownerEmails,
      lookalike: b.lookalike,
    })),
  });
}

/** Body: `{ brandId, verified }` */
export async function POST(request: NextRequest) {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const body = await readJsonBody(request);
  if (typeof body.brandId !== "string" || !isUuid(body.brandId) || typeof body.verified !== "boolean") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  await setBrandVerified(body.brandId, body.verified);
  return NextResponse.json({ ok: true });
}
