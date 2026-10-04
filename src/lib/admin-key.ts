import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Audit 04.10. (M9): Admin-Routen nehmen den Schlüssel nur noch als Header
 * (`x-admin-key`), nie mehr als `?key=` — eine URL landet in Logs und im
 * Browser-Verlauf. Gibt bei Erfolg null zurück, sonst die fertige Antwort.
 */
export function checkAdminKey(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_SEED_KEY;
  if (!expected) {
    return new NextResponse("ADMIN_SEED_KEY ist in den Vercel-Umgebungsvariablen nicht gesetzt — siehe README §5.", {
      status: 500,
    });
  }
  if (request.nextUrl.searchParams.has("key")) {
    return new NextResponse("Den Schlüssel bitte als Header x-admin-key senden, nicht in der URL.", { status: 400 });
  }
  const given = Buffer.from(request.headers.get("x-admin-key") ?? "");
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return new NextResponse("Falscher oder fehlender Key.", { status: 403 });
  }
  return null;
}
