import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/error-alerts";

// Luca 07.10.: Fehler aus dem Browser landen hier und damit in den
// Vercel-Logs („[client-error]“).
// Luca 25.10.: zusätzlich Fehler-Alarm (lib/error-alerts.ts) — Website schickt
// Text (sendBeacon in layout.tsx), die App JSON `{ source: "app", message, detail }`.
// Kein Login nötig; gleiche Fehler werden zusammengezählt, Mails sind gedrosselt.
export async function POST(request: NextRequest) {
  const raw = (await request.text().catch(() => "")).slice(0, 6000);
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 160);
  let source: "web" | "app" = "web";
  let message = raw;
  let detail: string | null = null;
  try {
    const body = JSON.parse(raw) as { source?: unknown; message?: unknown; detail?: unknown };
    if (body && typeof body.message === "string") {
      source = body.source === "app" ? "app" : "web";
      message = body.message;
      detail = typeof body.detail === "string" ? body.detail : null;
    }
  } catch {
    // Text von der Website.
  }
  const line = message.replace(/\s+/g, " ").slice(0, 600);
  if (!line) return new NextResponse(null, { status: 204 });
  console.error(`[client-error] ${source} ${line} | ${ua}`);
  // Website-Text hat die Form „/pfad :: Meldung“ — für die Zusammenfassung zählt nur die Meldung.
  const [path, ...rest] = line.split(" :: ");
  const summary = source === "web" && rest.length ? rest.join(" :: ") : line;
  if (process.env.NODE_ENV === "production") {
    await reportError(source, summary, [source === "web" && rest.length ? `Seite: ${path}` : null, detail, ua].filter(Boolean).join("\n"));
  }
  return new NextResponse(null, { status: 204 });
}
