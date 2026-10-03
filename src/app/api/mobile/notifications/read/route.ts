import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { markAllNotificationsReadFor, markNotificationReadFor } from "@/lib/notification";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5: „Alle als gelesen markieren“ aus der App. Mit `{ id }` nur diese eine
// (beim Antippen, Luca 03.10.).
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  if (typeof body.id === "string") {
    if (!isUuid(body.id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    await markNotificationReadFor(viewer.id, body.id);
  } else {
    await markAllNotificationsReadFor(viewer.id);
  }
  return NextResponse.json({ ok: true });
}
