import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { isExpoPushToken, removeMobilePushToken, saveMobilePushToken } from "@/lib/mobile-push";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-6: Push-Kennung des Geräts an-/abmelden. POST nach dem Login (und bei
// jedem App-Start, falls sich der Token ändert), DELETE beim Abmelden.

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { token, platform } = await readJsonBody(request);
  if (!isExpoPushToken(token)) return NextResponse.json({ error: "Ungültige Push-Kennung." }, { status: 400 });
  await saveMobilePushToken(viewer.id, token, platform === "android" ? "android" : "ios");
  return NextResponse.json({ ok: true });
}

// Die App ruft das beim Abmelden auf, solange ihr Login-Token noch gilt.
export async function DELETE(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { token } = await readJsonBody(request);
  if (!isExpoPushToken(token)) return NextResponse.json({ error: "Ungültige Push-Kennung." }, { status: 400 });
  await removeMobilePushToken(viewer.id, token);
  return NextResponse.json({ ok: true });
}
