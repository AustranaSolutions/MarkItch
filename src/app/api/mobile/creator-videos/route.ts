import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { postCreatorVideoFor } from "@/lib/creator-video";
import { fieldErrorResponse, isUuid, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-5d: Creator-Video für eine andere Marke posten (landet in deren
// Creator-Charts des laufenden Monats) — gleiche Logik wie die Web-Action
// postCreatorVideo. Video liegt schon in creator-videos.
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const body = await readJsonBody(request);
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  if (!isUuid(text(body.targetBrandId))) {
    return fieldErrorResponse({ _form: ["Bitte wähle die Marke aus, für die das Video ist."] });
  }
  const form = new FormData();
  form.set("targetBrandId", text(body.targetBrandId));
  form.set("videoUrl", text(body.videoUrl));
  form.set("description", text(body.description));
  form.set("ctaLabel", text(body.ctaLabel));
  form.set("ctaUrl", text(body.ctaUrl));
  if (body.audioRightsConfirmed === true) form.set("audioRightsConfirmed", "on");
  if (body.containsAiContent === true) form.set("containsAiContent", "on");

  const result = await postCreatorVideoFor(viewer, form);
  if (!result.ok) return fieldErrorResponse(result.errors);
  return NextResponse.json({ ok: true }, { status: 201 });
}
