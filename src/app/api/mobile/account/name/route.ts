import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { setNameForUser } from "@/lib/account";
import { fieldErrorResponse, readJsonBody, unauthorized } from "@/lib/mobile-auth";

/** Luca 02.11.: Name nachtragen (einmalige Abfrage in der App für Konten ohne Namen). */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  const result = await setNameForUser(viewer.id, { name: body.name });
  if (!result.ok) return fieldErrorResponse(result.errors);
  return NextResponse.json({ ok: true });
}
