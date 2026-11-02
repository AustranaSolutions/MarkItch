import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { isUuid } from "@/lib/mobile-auth";
import { getPublicViewerProfile } from "@/lib/public-profile";

/** Luca 02.11.: öffentliches Zuschauer-Profil (Name bei Meinungen/Reaktionen antippen). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const viewer = await getOptionalUser();
  const profile = await getPublicViewerProfile(id, viewer?.id ?? null);
  if (!profile) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  return NextResponse.json(profile);
}
