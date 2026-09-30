import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { submitCastingEntryFor } from "@/lib/casting-manage";
import { isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5d: eigenes Video zu einem Casting einreichen — gleiche Logik wie die
// Web-Action submitCastingEntry. Video liegt schon in casting-videos.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const body = await readJsonBody(request);
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const form = new FormData();
  form.set("castingId", id);
  form.set("videoUrl", text(body.videoUrl));
  form.set("description", text(body.description));
  form.set("ctaLabel", text(body.ctaLabel));
  form.set("ctaUrl", text(body.ctaUrl));
  if (body.audioRightsConfirmed === true) form.set("audioRightsConfirmed", "on");
  if (body.containsAiContent === true) form.set("containsAiContent", "on");

  const result = await submitCastingEntryFor(viewer, form);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
