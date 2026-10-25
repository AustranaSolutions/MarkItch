import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { createSoloPitchForUser } from "@/lib/solo-pitch";
import { deleteDraft } from "@/lib/drafts";
import { fieldErrorResponse, readJsonBody, unauthorized } from "@/lib/mobile-auth";

// RN-4c: Solo-Pitch aus der App posten — gleiche Logik wie die Web-Action
// postSoloPitch (lib/solo-pitch.ts). Das Video ist schon über
// /api/upload/prepare direkt in den Speicher hochgeladen, hier kommt nur die
// URL an (Vercels 4,5-MB-Grenze für Request-Bodies, siehe storage.ts).
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();

  const body = await readJsonBody(request);
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const form = new FormData();
  form.set("videoUrl", text(body.videoUrl));
  form.set("description", text(body.description));
  form.set("ctaLabel", text(body.ctaLabel));
  form.set("ctaUrl", text(body.ctaUrl));
  if (body.audioRightsConfirmed === true) form.set("audioRightsConfirmed", "on");
  if (body.containsAiContent === true) form.set("containsAiContent", "on");
  if (body.paidPartnership === true) form.set("paidPartnership", "on");

  const result = await createSoloPitchForUser(viewer.id, form);
  if (!result.ok) return fieldErrorResponse(result.errors);
  // Luca 25.10.: aus einem Entwurf gepostet → Entwurf weg (das Video gehört jetzt dem Pitch).
  if (typeof body.draftId === "string") await deleteDraft(viewer.id, body.draftId).catch(() => {});
  return NextResponse.json({ id: result.id }, { status: 201 });
}
