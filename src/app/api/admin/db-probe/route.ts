import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getForYouFeedWithReactions } from "@/lib/feed";
import { checkAdminKey } from "@/lib/admin-key";

// 25.10. (Fehlersuche, wieder entfernen): misst auf dem Vercel-Server, welche
// Art von Datenbankverbindung über Supabases Pooler hängt. Nur `select 1`.
// POST mit x-admin-key, Body {"exp": "shared" | "fresh" | "fresh-noparams", "n": 1–8}.
export const maxDuration = 30;

type Result = { i: number; ms: number; ok: boolean; error?: string };

async function timedTask(i: number, run: () => Promise<unknown>, limitMs = 9000): Promise<Result> {
  const started = Date.now();
  try {
    await Promise.race([
      run(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT ${limitMs / 1000} s`)), limitMs)),
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

  if (exp === "feed") {
    const trace: { label: string; ms?: number }[] = [];
    (globalThis as { __feedTrace?: typeof trace }).__feedTrace = trace;
    const feedResults = await Promise.all(
      Array.from({ length: n }, (_, i) => timedTask(i, () => getForYouFeedWithReactions(null, 0, 6), 15000)),
    );
    delete (globalThis as { __feedTrace?: typeof trace }).__feedTrace;
    const slow = trace.filter((t) => t.ms === undefined || t.ms > 1000);
    return NextResponse.json({ exp, n, results: feedResults, steps: trace.length, slow });
  }

  if (exp.startsWith("load")) {
    // Wie die App: Client mit max 4, Gruppen aus 4 gleichzeitigen Abfragen, n Clients gleichzeitig.
    const variant = new URL(url);
    if (exp === "load5432") variant.port = "5432";
    const rounds = 12;
    const perClient = await Promise.all(
      Array.from({ length: n }, async (_, c) => {
        const client = postgres(variant.toString(), {
          prepare: false,
          connect_timeout: 10,
          idle_timeout: 20,
          max: 4,
          ...({ max_pipeline: body?.pipeline === false ? 1 : 100 } as object),
          connection: { statement_timeout: 10000, lock_timeout: 10000 },
        });
        let timeouts = 0;
        let slowest = 0;
        let done = 0;
        for (let r = 0; r < rounds; r++) {
          const group = await Promise.all(
            Array.from({ length: 4 }, (_, q) =>
              timedTask(q, () => client`select count(*) from battles b join brands a on a.id = b.brand_a_id`, 6000),
            ),
          );
          for (const g of group) {
            done += 1;
            if (!g.ok) timeouts += 1;
            slowest = Math.max(slowest, g.ms);
          }
          if (timeouts >= 4) break;
        }
        client.end({ timeout: 1 }).catch(() => {});
        return { client: c, queries: done, timeouts, slowestMs: slowest };
      }),
    );
    return NextResponse.json({ exp, n, perClient });
  }

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
