import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { mobilePushTokens } from "@/db/schema";

// RN-6: Push an die native App über den Expo Push Service
// (https://exp.host/--/api/v2/push/send). Kostenlos, kein eigenes Konto
// nötig; nur wenn in Expo „Enhanced Security" aktiviert wird, braucht es
// EXPO_ACCESS_TOKEN. Expo leitet an Apple (APNs) weiter — dafür muss die App
// mit einem Apple-Developer-Konto gebaut sein, sonst kommt nichts an.
//
// Bewusst „fail-soft": nichts hier darf einen Fehler nach außen werfen
// (battle-notify.ts ruft ohne catch auf), und eine fehlende Tabelle (Deploy
// vor /api/admin/migrate) darf keine Benachrichtigung verhindern.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export function isExpoPushToken(token: unknown): token is string {
  return typeof token === "string" && EXPO_TOKEN_RE.test(token);
}

/** Upsert per Token — dasselbe Gerät mit anderem Account übernimmt den Token. */
export async function saveMobilePushToken(userId: string, token: string, platform: string): Promise<void> {
  await db
    .insert(mobilePushTokens)
    .values({ userId, token, platform })
    .onConflictDoUpdate({
      target: mobilePushTokens.token,
      set: { userId, platform, updatedAt: new Date() },
    });
}

/** Beim Abmelden: dieses Gerät bekommt keine Pushes mehr für den Account. */
export async function removeMobilePushToken(userId: string, token: string): Promise<void> {
  await db
    .delete(mobilePushTokens)
    .where(and(eq(mobilePushTokens.token, token), eq(mobilePushTokens.userId, userId)));
}

type ExpoTicket = { status: "ok" | "error"; details?: { error?: string } };

export async function sendMobilePushToUser(userId: string, payload: { title: string; body: string; url: string }): Promise<void> {
  try {
    const rows = await db.select().from(mobilePushTokens).where(eq(mobilePushTokens.userId, userId));
    if (rows.length === 0) return;

    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(
        rows.map((row) => ({
          to: row.token,
          title: payload.title,
          body: payload.body,
          sound: "default",
          // Die App öffnet beim Antippen genau dieses Ziel (openAppLink).
          data: { url: payload.url },
        })),
      ),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[mobile-push] Expo antwortete ${res.status}`);
      return;
    }
    // Tickets kommen in derselben Reihenfolge wie die Nachrichten zurück.
    // „DeviceNotRegistered" = App gelöscht oder Push abgeschaltet → Token weg.
    const { data } = (await res.json()) as { data?: ExpoTicket[] };
    const dead = (data ?? [])
      .map((ticket, i) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? rows[i]?.token : null))
      .filter((t): t is string => Boolean(t));
    if (dead.length > 0) await db.delete(mobilePushTokens).where(inArray(mobilePushTokens.token, dead));
  } catch (err) {
    console.error(`[mobile-push] failed to notify user ${userId}:`, err);
  }
}
