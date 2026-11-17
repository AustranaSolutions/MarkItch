import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getBlockedIds } from "@/lib/block";
import { getOpenCastings } from "@/lib/casting";

// Luca 17.11. (Phasen-Map 4.3): alle offenen Partner-Castings für die App-Liste.
export async function GET() {
  const viewer = await getOptionalUser();
  const blocked = await getBlockedIds(viewer?.id ?? null);
  const castings = await getOpenCastings(blocked.brandIds);
  return NextResponse.json({
    castings: castings.map((c) => ({ ...c, submissionDeadline: c.submissionDeadline.toISOString() })),
  });
}
