import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { isAdminEmail } from "@/lib/moderation";
import { listBrandsForAdmin, setBrandVerified } from "@/lib/brand-verify";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// Luca 11.10.: Marken verifizieren direkt in der App (vorher nur über die
// Website /admin/brands, im In-App-Browser ohne Login). Nur ADMIN_EMAILS.

async function requireAdmin() {
  const viewer = await getOptionalUser();
  if (!viewer) return { error: unauthorized() };
  if (!isAdminEmail(viewer.email)) {
    return { error: NextResponse.json({ error: "Nur für Admins." }, { status: 403 }) };
  }
  return { viewer };
}

export async function GET() {
  const { error } = await requireAdmin();
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
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await readJsonBody(request);
  if (typeof body.brandId !== "string" || !isUuid(body.brandId) || typeof body.verified !== "boolean") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  await setBrandVerified(body.brandId, body.verified);
  return NextResponse.json({ ok: true });
}
