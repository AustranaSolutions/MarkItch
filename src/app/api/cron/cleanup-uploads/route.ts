import { NextRequest, NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-key";
import { cleanupOrphanedUploads } from "@/lib/upload-cleanup";

// Audit 04.10. (H5): verwaiste Uploads aufräumen (siehe lib/upload-cleanup.ts).
//
// GET  = täglicher Vercel-Cron (vercel.json). Läuft nur, wenn CRON_SECRET in
//        Vercel gesetzt ist — Vercel schickt es dann als Bearer-Token mit.
// POST = von Hand mit Header x-admin-key; Body {"dryRun": true} listet nur auf.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Nicht erlaubt.", { status: 403 });
  }
  try {
    const result = await cleanupOrphanedUploads({ dryRun: false });
    return NextResponse.json({ checked: result.checked, deleted: result.deleted });
  } catch (err) {
    console.error("[cron/cleanup-uploads]", err);
    return NextResponse.json({ error: "Aufräumen fehlgeschlagen." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const dryRun = body?.dryRun !== false;
  try {
    return NextResponse.json(await cleanupOrphanedUploads({ dryRun }));
  } catch (err) {
    console.error("[cron/cleanup-uploads]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
