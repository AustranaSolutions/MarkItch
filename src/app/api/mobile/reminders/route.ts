import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { toggleReminderFor } from "@/lib/reminder";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5: Erinnerung an einem kommenden Duell an/aus — wie die Web-Action toggleReminder.
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { battleId } = await readJsonBody(request);
  if (typeof battleId !== "string" || !battleId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  return NextResponse.json(await toggleReminderFor(viewer.id, battleId));
}
