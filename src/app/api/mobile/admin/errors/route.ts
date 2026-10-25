import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { errorEvents } from "@/db/schema";
import { readJsonBody } from "@/lib/mobile-auth";
import { requireMobileAdmin } from "@/lib/mobile-admin";

// Luca 25.10.: Fehler-Alarm in der App — wie /admin/errors.

export async function GET() {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const rows = await db.select().from(errorEvents).orderBy(desc(errorEvents.lastSeenAt)).limit(100);
  return NextResponse.json({
    errors: rows.map((r) => ({
      signature: r.signature,
      source: r.source,
      message: r.message,
      detail: r.detail,
      count: r.count,
      lastSeenAt: r.lastSeenAt.toISOString(),
    })),
  });
}

/** Body: `{ signature }` — Eintrag als erledigt entfernen. */
export async function POST(request: NextRequest) {
  const { error } = await requireMobileAdmin();
  if (error) return error;
  const body = await readJsonBody(request);
  if (typeof body.signature !== "string" || !body.signature) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  await db.delete(errorEvents).where(eq(errorEvents.signature, body.signature));
  return NextResponse.json({ ok: true });
}
