import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { getBrandForUser } from "@/lib/brand";
import { activateBattleIfBothSidesReady } from "@/lib/battle-stage";
import { readVideoUrlField } from "@/lib/storage";
import { validateCtaLink } from "@/lib/cta-link";
import { AudioRightsSchema } from "@/lib/validation";

/**
 * RN-5b: eigene Seite eines Duells einreichen — gemeinsam genutzt von der
 * Web-Action uploadBattleVideo und der App-Route /api/mobile/battles/[id]/video.
 * Erwartet dieselben Feldnamen wie das Web-Formular (videoUrl, ctaLabel,
 * ctaUrl, audioRightsConfirmed, containsAiContent). Sind danach beide Seiten
 * da, startet das Abstimmen (activateBattleIfBothSidesReady).
 */
export async function submitBattleVideoFor(
  user: { id: string },
  battleId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du hast keine Marke." };
  }

  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId)).limit(1);
  if (!battle) {
    return { ok: false, error: "Dieser Pitch existiert nicht." };
  }

  const isA = battle.brandAId === myBrand.id;
  const isB = battle.brandBId === myBrand.id;
  if (!isA && !isB) {
    return { ok: false, error: "Das ist nicht dein Pitch." };
  }
  if ((isA && battle.brandAVideoUrl) || (isB && battle.brandBVideoUrl)) {
    return { ok: false, error: "Du hast für diesen Pitch bereits ein Video hochgeladen." };
  }
  if (battle.productionDeadline && battle.productionDeadline.getTime() < Date.now()) {
    return { ok: false, error: "Die Frist für diesen Pitch ist abgelaufen." };
  }

  const video = readVideoUrlField(formData, "battle-videos");
  if ("error" in video) {
    return { ok: false, error: video.error };
  }

  const cta = validateCtaLink(formData);
  if ("errors" in cta) {
    return { ok: false, error: Object.values(cta.errors)[0]![0] };
  }

  const audioRights = AudioRightsSchema.safeParse({ audioRightsConfirmed: formData.get("audioRightsConfirmed") });
  if (!audioRights.success) {
    return { ok: false, error: Object.values(audioRights.error.flatten().fieldErrors)[0]![0] };
  }

  const now = new Date();

  const containsAiContent = formData.get("containsAiContent") === "on";

  await db
    .update(battles)
    .set(
      isA
        ? {
            brandAVideoUrl: video.videoUrl,
            brandASubmittedAt: now,
            brandACtaLabel: cta.ctaLabel,
            brandACtaUrl: cta.ctaUrl,
            brandAContainsAiContent: containsAiContent,
          }
        : {
            brandBVideoUrl: video.videoUrl,
            brandBSubmittedAt: now,
            brandBCtaLabel: cta.ctaLabel,
            brandBCtaUrl: cta.ctaUrl,
            brandBContainsAiContent: containsAiContent,
          },
    )
    .where(eq(battles.id, battleId));

  await activateBattleIfBothSidesReady(battleId);
  return { ok: true };
}
