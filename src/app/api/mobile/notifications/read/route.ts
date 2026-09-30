import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { markAllNotificationsReadFor } from "@/lib/notification";
import { unauthorized } from "@/lib/mobile-auth";

// RN-5: „Alle als gelesen markieren“ aus der App.
export async function POST() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  await markAllNotificationsReadFor(viewer.id);
  return NextResponse.json({ ok: true });
}
