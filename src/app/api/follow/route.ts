import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { toggleFollowForUser } from "@/lib/follow";

/** RN-3: Folgen an/aus für die App — gleiche Logik wie die Web-Action toggleFollow (lib/follow.ts). */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const brandId = body?.brandId;
  if (typeof brandId !== "string" || !brandId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Diese Marke gibt es nicht." }, { status: 404 });
  }

  const result = await toggleFollowForUser(viewer.id, brandId);
  return NextResponse.json(result);
}
