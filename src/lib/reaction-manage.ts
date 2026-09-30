import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { reactions, soloPitches } from "@/db/schema";
import { getBrandForUser } from "@/lib/brand";
import { promoteReactionToBattle } from "@/lib/reaction";
import { readVideoUrlField } from "@/lib/storage";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { AudioRightsSchema } from "@/lib/validation";

// RN-5c: Reaktion posten / zum Duell hochstufen — gemeinsam genutzt von den
// Web-Actions (actions/reaction.ts) und den App-Routen (/api/mobile/reactions*).

export type ReactionResult = { ok: true } | { ok: false; error: string };

/**
 * Phase 13: any brand reacts to a solo pitch, no permission needed — never
 * on a battle side (see CLAUDE-CODE-UEBERGABE.md §6).
 *
 * Phase 40: a reaction can now optionally reply to another reaction
 * (`parentReactionId`) instead of only ever the pitch itself, so two
 * brands can go back and forth ("Coke vs. Pepsi") — see schema.ts's
 * comment on the `reactions` table for the two unique indexes this relies
 * on. When replying, `soloPitchId` is re-derived from the parent reaction
 * rather than trusted from the form, so the denormalized root can't drift.
 *
 * Bugfix: the old existence check queried *any* reaction on this pitch,
 * not this brand's own — which meant only the very first brand to react
 * to a given pitch could ever do so via this form at all (the unique index
 * itself was still per-brand and never actually hit).
 */
export async function postReactionFor(user: { id: string }, formData: FormData): Promise<ReactionResult> {
  const soloPitchIdInput = formData.get("soloPitchId");
  const parentReactionIdInput = formData.get("parentReactionId");
  if (typeof soloPitchIdInput !== "string" || !soloPitchIdInput) {
    return { ok: false, error: "Ungültige Anfrage." };
  }
  const parentReactionId = typeof parentReactionIdInput === "string" && parentReactionIdInput ? parentReactionIdInput : null;

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du musst zuerst eine Marke erstellen, um zu reagieren." };
  }

  const [pitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, soloPitchIdInput)).limit(1);
  if (!pitch) {
    return { ok: false, error: "Dieser Pitch existiert nicht." };
  }

  let soloPitchId = pitch.id;
  if (parentReactionId) {
    const [parent] = await db.select().from(reactions).where(eq(reactions.id, parentReactionId)).limit(1);
    if (!parent) {
      return { ok: false, error: "Diese Reaktion existiert nicht mehr." };
    }
    if (parent.brandId === myBrand.id) {
      return { ok: false, error: "Du kannst nicht auf deine eigene Reaktion antworten." };
    }
    soloPitchId = parent.soloPitchId;
  } else if (pitch.brandId === myBrand.id) {
    return { ok: false, error: "Du kannst nicht auf deinen eigenen Pitch reagieren." };
  }

  const [existing] = await db
    .select({ id: reactions.id })
    .from(reactions)
    .where(
      parentReactionId
        ? and(eq(reactions.parentReactionId, parentReactionId), eq(reactions.brandId, myBrand.id))
        : and(eq(reactions.soloPitchId, soloPitchId), isNull(reactions.parentReactionId), eq(reactions.brandId, myBrand.id)),
    );
  if (existing) {
    return { ok: false, error: parentReactionId ? "Du hast auf diese Reaktion bereits geantwortet." : "Du hast auf diesen Pitch bereits reagiert." };
  }

  const { allowed } = await checkRateLimit("reaction", myBrand.id);
  if (!allowed) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const video = readVideoUrlField(formData, "reaction-videos");
  if ("error" in video) {
    return { ok: false, error: video.error };
  }

  const audioRights = AudioRightsSchema.safeParse({ audioRightsConfirmed: formData.get("audioRightsConfirmed") });
  if (!audioRights.success) {
    return { ok: false, error: Object.values(audioRights.error.flatten().fieldErrors)[0]![0] };
  }

  await db.insert(reactions).values({
    soloPitchId,
    parentReactionId,
    brandId: myBrand.id,
    videoUrl: video.videoUrl,
    containsAiContent: formData.get("containsAiContent") === "on",
  });

  return { ok: true };
}

/** The original brand upgrades a reaction straight to an official Duell. */
export async function promoteReactionFor(
  user: { id: string },
  reactionId: unknown,
): Promise<{ ok: true; battleId: string } | { ok: false; error: string }> {
  if (typeof reactionId !== "string" || !reactionId) {
    return { ok: false, error: "Ungültige Anfrage." };
  }
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du hast keine Marke." };
  }
  try {
    return { ok: true, battleId: await promoteReactionToBattle(reactionId, myBrand.id) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Hochstufen fehlgeschlagen." };
  }
}
