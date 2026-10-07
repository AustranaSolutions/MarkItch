import { NextRequest, NextResponse } from "next/server";

// Luca 07.10.: Fehler aus dem Browser landen hier und damit in den
// Vercel-Logs („[client-error]“) — die Website hing bei Luca, ließ sich aber
// sonst nirgends nachstellen. Nur Text, gekürzt, nichts wird gespeichert.
export async function POST(request: NextRequest) {
  const raw = await request.text().catch(() => "");
  const line = raw.replace(/\s+/g, " ").slice(0, 600);
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 160);
  if (line) console.error(`[client-error] ${line} | ${ua}`);
  return new NextResponse(null, { status: 204 });
}
