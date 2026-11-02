import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reactions, soloPitches, users } from "@/db/schema";
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

  // Phase E (Luca 04.10.): Zuschauer (Assent) reagieren als „Community“ mit
  // ihrem eigenen Konto; Marken weiterhin als Marke. Ein Acro-Konto ohne
  // Marke muss die Marke zuerst anlegen.
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    const [account] = await db.select({ accountType: users.accountType }).from(users).where(eq(users.id, user.id)).limit(1);
    if (account?.accountType !== "assent") {
      return { ok: false, error: "Du musst zuerst eine Marke erstellen, um zu reagieren." };
    }
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
    if (myBrand ? parent.brandId === myBrand.id : parent.userId === user.id) {
      return { ok: false, error: "Du kannst nicht auf deine eigene Reaktion antworten." };
    }
    soloPitchId = parent.soloPitchId;
  } else if (myBrand && pitch.brandId === myBrand.id) {
    return { ok: false, error: "Du kannst nicht auf deinen eigenen Pitch reagieren." };
  }

  // Luca 02.11.: kein Limit mehr — mehrere Reaktionen/Antworten erlaubt (Rate-Limit bleibt).
  const { allowed } = await checkRateLimit("reaction", myBrand ? myBrand.id : `user:${user.id}`);
  if (!allowed) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const video = await readVideoUrlField(formData, "reaction-videos", user.id);
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
    ...(myBrand ? { brandId: myBrand.id } : { userId: user.id }),
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

/**
 * Luca 02.11.: eigene Reaktion löschen (wie Marken ihre Pitches) — Zuschauer
 * ihre Community-Reaktion, Marken die Reaktion ihrer Marke. Antworten darauf
 * verschwinden mit (cascade). Schon zum Duell hochgestuft → nicht löschbar.
 */
export async function deleteOwnReactionFor(user: { id: string }, reactionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [reaction] = await db.select().from(reactions).where(eq(reactions.id, reactionId)).limit(1);
  if (!reaction) return { ok: false, error: "Diese Reaktion existiert nicht mehr." };
  const myBrand = reaction.brandId ? await getBrandForUser(user.id) : null;
  const own = reaction.userId === user.id || (reaction.brandId !== null && myBrand?.id === reaction.brandId);
  if (!own) return { ok: false, error: "Das ist nicht deine Reaktion." };
  if (reaction.promotedToBattleId) return { ok: false, error: "Aus dieser Reaktion ist schon ein Duell geworden — sie lässt sich nicht mehr löschen." };
  await db.delete(reactions).where(eq(reactions.id, reactionId));
  return { ok: true };
}
