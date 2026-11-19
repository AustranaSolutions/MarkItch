import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { saveSubscription } from "@/lib/push";
import { apiError } from "@/lib/api-error";

/**
 * Sicherheits-Check 19.11.: der Server ruft die gespeicherte Adresse später
 * selbst auf — nur echte Push-Dienste der Browser zulassen (sonst könnte man
 * ihn auf beliebige Adressen schicken).
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /\.notify\.windows\.com$/];

function isPushServiceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return await apiError({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { endpoint, p256dh, auth } = body ?? {};
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string" || !isPushServiceUrl(endpoint)) {
    return await apiError({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  await saveSubscription({ userId: viewer.id, endpoint, p256dh, auth });
  return NextResponse.json({ ok: true });
}
