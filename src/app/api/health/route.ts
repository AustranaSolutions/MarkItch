import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

// Luca 25.10.: für die Erreichbarkeits-Prüfung (.github/workflows/uptime.yml, alle 30 Min.).
// Prüft auch die Datenbank — beim Feed-Ausfall am 24.10. lief die Website, nur die DB-Abfragen hingen.
export async function GET() {
  const started = Date.now();
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Datenbank antwortet nicht (5 s)")), 5000)),
    ]);
    return NextResponse.json({ ok: true, dbMs: Date.now() - started });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 503 });
  }
}
