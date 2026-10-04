import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { seedDemoContent } from "@/lib/seed-demo-data";
import { checkAdminKey } from "@/lib/admin-key";

// Phase 12: a browser-visitable way to (re)seed demo content — the point is
// specifically that populating a fresh Vercel deployment's prod database
// never requires a terminal or copying a DATABASE_URL anywhere. Visit
// /api/admin/seed-demo?key=<ADMIN_SEED_KEY> once after each deploy (it's
// idempotent — see seedDemoContent's own comment — so visiting it again
// just re-rolls the same fictional dataset, harmless).
//
// Protected by a single shared-secret query param rather than requiring
// login as a specific admin account — there's no admin-role concept in this
// app yet, and the operation is scoped to fully namespaced, disposable demo
// rows (see seedDemoContent), so a leaked key's worst case is someone
// re-rolling the demo dataset, not touching real data.
// Audit 04.10. (M9): per POST mit Header x-admin-key, und in Produktion
// gesperrt — dort würde es Demo-Marken wieder anlegen, die vor dem Launch
// bewusst entfernt werden sollen.
export async function POST(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse("In Produktion gesperrt.", { status: 403 });
  }
  const denied = checkAdminKey(request);
  if (denied) return denied;

  try {
    const result = await seedDemoContent(db);
    return new NextResponse(
      `OK — ${result.brands} Marken, ${result.battles} Pitches, ${result.viewers} Demo-Zuschauer angelegt. Du kannst dieses Tab jetzt schließen und den Feed öffnen.`,
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  } catch (err) {
    console.error("[admin/seed-demo]", err);
    return new NextResponse("Fehler beim Seeden — siehe Vercel-Logs.", { status: 500 });
  }
}
