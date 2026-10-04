import { NextRequest, NextResponse } from "next/server";
import { runPendingMigrations } from "@/lib/db-migrate";
import { checkAdminKey } from "@/lib/admin-key";

// Phase 12c: browser-visitable schema migration, same shape and same shared
// secret as /api/admin/seed-demo (see that route's comment). This exists
// because deploying new code to Vercel does NOT automatically apply pending
// SQL migrations to the (Supabase) database — that step was missing from
// Phase 11/12's rollout, which is why the first production deploy 500'd on
// every request that touched the `battles` table (it selects a column,
// result_notified_at, that only exists in application code's schema, not
// yet in the actual database) and the demo-seed endpoint failed the same
// way (it writes to push_subscriptions, a table that didn't exist yet).
//
// Nach jedem Deploy, der src/db/schema.ts ändert, einmal aufrufen — seit dem
// Audit 04.10. per POST mit Header (siehe lib/admin-key.ts):
//   curl -X POST -H "x-admin-key: <ADMIN_SEED_KEY>" https://markitch.vercel.app/api/admin/migrate
// Mehrfach aufrufen ist harmlos (drizzle merkt sich, was schon lief).
export async function POST(request: NextRequest) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  try {
    await runPendingMigrations();
    return new NextResponse(
      "OK — Datenbank-Schema ist jetzt aktuell.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  } catch (err) {
    console.error("[admin/migrate]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Fehler bei der Migration: ${detail}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
