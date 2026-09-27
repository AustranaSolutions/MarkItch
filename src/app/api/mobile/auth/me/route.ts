import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { sessionResponse } from "@/lib/mobile-auth";

/**
 * RN-2: Beim App-Start aufgerufen. Prüft das mitgeschickte Token (inkl.
 * Sperre/gelöschter Account/geändertes Passwort, siehe session.ts) und gibt
 * aktuelle Nutzerdaten + ein frisches Token zurück — wer die App regelmäßig
 * öffnet, bleibt so angemeldet, statt nach 30 Tagen fix rauszufliegen.
 */
export async function GET() {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }
  const [user] = await db.select().from(users).where(eq(users.id, viewer.id)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }
  return sessionResponse(user);
}
