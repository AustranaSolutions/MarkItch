import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { readJsonBody, unauthorized } from "@/lib/mobile-auth";
import { NOTIFICATION_KINDS, parseMutedKinds } from "@/lib/notification-kinds";

// Luca 16.11. (Phasen-Map 3.4): Benachrichtigungen einzeln an/aus.
// GET → { kinds, muted }, PATCH `{ muted: ["like", …] }` → speichert die abgeschalteten Arten.

export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const [row] = await db.select({ muted: users.mutedNotificationKinds }).from(users).where(eq(users.id, viewer.id)).limit(1);
  return NextResponse.json({ kinds: NOTIFICATION_KINDS, muted: parseMutedKinds(row?.muted) });
}

export async function PATCH(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const muted = parseMutedKinds((await readJsonBody(request)).muted);
  await db.update(users).set({ mutedNotificationKinds: muted, updatedAt: new Date() }).where(eq(users.id, viewer.id));
  return NextResponse.json({ kinds: NOTIFICATION_KINDS, muted });
}
