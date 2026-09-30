import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { submitToChallengeFor } from "@/lib/creator-challenge";
import { fieldErrorResponse, isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-7: bei einer Creator-Challenge mitmachen — ein normaler Solo-Pitch mit
// Verweis auf die Challenge (Video liegt schon in solo-pitch-videos).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const body = await readJsonBody(request);
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const form = new FormData();
  form.set("videoUrl", text(body.videoUrl));
  form.set("description", text(body.description));
  form.set("ctaLabel", text(body.ctaLabel));
  form.set("ctaUrl", text(body.ctaUrl));
  if (body.audioRightsConfirmed === true) form.set("audioRightsConfirmed", "on");
  if (body.containsAiContent === true) form.set("containsAiContent", "on");
  const result = await submitToChallengeFor(viewer, id, form);
  if (!result.ok) return fieldErrorResponse(result.errors);
  return NextResponse.json({ soloPitchId: result.soloPitchId }, { status: 201 });
}
