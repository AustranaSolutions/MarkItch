import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { reconfigureDb } from "@/db";
import { reapStuckBackends } from "@/lib/db-reaper";
import { getForYouFeed } from "@/lib/feed";
import { checkAdminKey } from "@/lib/admin-key";

// 25.10. (Fehlersuche, wieder entfernen): echte Feed-Aufbauten gleichzeitig unter
// verschiedenen Pool-Einstellungen. POST x-admin-key, {"variant":"v0".., "n":4, "rounds":2}.
export const maxDuration = 60;

const VARIANTS: Record<string, Record<string, unknown>> = {
  v0: {},
  v1: { connection: undefined },
  v2: { max: 1 },
  v3: { max: 10, max_pipeline: 100 },
  v4: { max_pipeline: 100 },
  v5: { max: 4, max_pipeline: 100, connection: undefined, idle_timeout: 0 },
};

export async function POST(request: NextRequest) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const variant = typeof body?.variant === "string" && body.variant in VARIANTS ? body.variant : "v0";
  const n = Math.min(Math.max(Number(body?.n) || 4, 1), 6);
  const rounds = Math.min(Math.max(Number(body?.rounds) || 2, 1), 3);

  if (body?.param === true) {
    // Gleiche Last wie die App, einmal ohne und einmal mit Parametern (Parameter => Parse+Describe+Flush, dann Bind).
    const withParam = body?.withParam !== false;
    const rounds = 12;
    const perClient = await Promise.all(
      Array.from({ length: n }, async (_, c) => {
        const client = postgres(process.env.DATABASE_URL!, {
          prepare: false,
          connect_timeout: 10,
          idle_timeout: 20,
          max: 4,
          connection: { statement_timeout: 10000, lock_timeout: 10000 },
        });
        let timeouts = 0;
        let done = 0;
        let slowest = 0;
        for (let r = 0; r < rounds; r++) {
          const group = await Promise.all(
            Array.from({ length: 4 }, (_, q) =>
              timedTask(
                q,
                () =>
                  withParam
                    ? client`select count(*) from battles b join brands a on a.id = b.brand_a_id where b.created_at <= ${new Date()} and a.slug <> ${"x" + q}`
                    : client`select count(*) from battles b join brands a on a.id = b.brand_a_id`,
                6000,
              ),
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
    return NextResponse.json({ withParam, n, perClient });
  }

  if (body?.reap === true) {
    const killed = await reapStuckBackends();
    return NextResponse.json({ killed });
  }

  if (body?.diag === true) {
    // Feed-Aufbauten starten (nicht abwarten), nach 6 s Verbindungsliste der Datenbank lesen.
    (globalThis as { __noHedge?: boolean }).__noHedge = true;
    reconfigureDb(VARIANTS[variant]);
    const builds = Array.from({ length: n }, async () => {
      const started = Date.now();
      try {
        await Promise.race([
          getForYouFeed(null, 0, 6),
          new Promise((_, reject) => setTimeout(() => reject(new Error("T")), 14000)),
        ]);
        return Date.now() - started;
      } catch {
        return -1;
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 6000));
    const probe = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 10, max: 1 });
    let rows: unknown = null;
    try {
      rows = await probe`
        select state, wait_event_type, wait_event, count(*)::int as n,
               max(extract(epoch from (now() - state_change)))::int as max_age_s,
               max(left(query, 90)) as sample_query
        from pg_stat_activity
        where datname = 'postgres' and pid <> pg_backend_pid()
        group by 1, 2, 3 order by n desc`;
    } catch (err) {
      rows = String(err);
    }
    probe.end({ timeout: 1 }).catch(() => {});
    const done = await Promise.all(builds);
    delete (globalThis as { __noHedge?: boolean }).__noHedge;
    reconfigureDb({});
    return NextResponse.json({ variant, n, done, activity: rows });
  }

  (globalThis as { __noHedge?: boolean }).__noHedge = true;
  reconfigureDb(VARIANTS[variant]);
  const times: string[] = [];
  let timeouts = 0;
  for (let r = 0; r < rounds; r++) {
    const results = await Promise.all(
      Array.from({ length: n }, async () => {
        const started = Date.now();
        try {
          await Promise.race([
            getForYouFeed(null, 0, 6),
            new Promise((_, reject) => setTimeout(() => reject(new Error("T")), 12000)),
          ]);
          return Date.now() - started;
        } catch {
          return -1;
        }
      }),
    );
    for (const ms of results) {
      if (ms < 0) {
        timeouts += 1;
        times.push("TIMEOUT");
      } else times.push(`${ms}`);
    }
  }
  delete (globalThis as { __noHedge?: boolean }).__noHedge;
  reconfigureDb({});
  return NextResponse.json({ variant, n, rounds, timeouts, times });
}
