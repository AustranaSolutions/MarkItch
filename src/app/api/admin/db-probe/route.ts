import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { checkAdminKey } from "@/lib/admin-key";

// 25.10. (Fehlersuche, wieder entfernen): misst auf dem Vercel-Server, welche
// Art von Datenbankverbindung über Supabases Pooler hängt. Nur `select 1`.
// POST mit x-admin-key, Body {"exp": "shared" | "fresh" | "fresh-noparams", "n": 1–8}.
export const maxDuration = 30;

type Result = { i: number; ms: number; ok: boolean; error?: string };

async function timedTask(i: number, run: () => Promise<unknown>): Promise<Result> {
  const started = Date.now();
  try {
    await Promise.race([
      run(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT 9 s")), 9000)),
    ]);
    return { i, ms: Date.now() - started, ok: true };
  } catch (err) {
    return { i, ms: Date.now() - started, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function POST(request: NextRequest) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const exp = typeof body?.exp === "string" ? body.exp : "shared";
  const n = Math.min(Math.max(Number(body?.n) || 4, 1), 8);
  const url = process.env.DATABASE_URL!;

  const tasks = Array.from({ length: n }, (_, i) => {
    if (exp === "shared") return timedTask(i, () => db.execute(sql`select 1`));
    return timedTask(i, async () => {
      const client = postgres(url, {
        prepare: false,
        connect_timeout: 10,
        max: 1,
        ...(exp === "fresh" ? { connection: { statement_timeout: 10000, lock_timeout: 10000 } } : {}),
      });
      try {
        await client`select 1`;
      } finally {
        client.end({ timeout: 1 }).catch(() => {});
      }
    });
  });

  const results = await Promise.all(tasks);
  return NextResponse.json({ exp, n, results });
}
