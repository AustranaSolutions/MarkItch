import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reactions, soloPitches, users, type Reaction } from "@/db/schema";
import { getBrandForUser, getBrandMemberUserIds } from "@/lib/brand";
import { validateCtaLink } from "@/lib/cta-link";
import { notifyUsers } from "@/lib/notification";
import { MAX_SOLO_PITCH_DESCRIPTION_LENGTH, validateDescription } from "@/lib/solo-pitch";
import { promoteReactionToBattle } from "@/lib/reaction";
import { readVideoUrlField } from "@/lib/storage";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { AudioRightsSchema } from "@/lib/validation";

// RN-5c: Reaktion posten / zum Duell hochstufen — gemeinsam genutzt von den
// Web-Actions (actions/reaction.ts) und den App-Routen (/api/mobile/reactions*).

export type ReactionResult = { ok: true } | { ok: false; error: string; errors?: Record<string, string[]> };

/** Luca 19.11.: Beschreibung bei Reaktionen optional (ältere Apps senden keine), Länge wie bei Posts. */
function optionalDescription(raw: unknown): { description: string | null } | { error: string } {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { description: null };
  if (text.length > MAX_SOLO_PITCH_DESCRIPTION_LENGTH) return { error: `Maximal ${MAX_SOLO_PITCH_DESCRIPTION_LENGTH} Zeichen.` };
  return { description: text };
}

/** Oberste Reaktion einer Kette (die Reaktion auf das Original). */
async function rootReactionOf(reaction: Reaction): Promise<Reaction> {
  let current = reaction;
  for (let depth = 0; current.parentReactionId && depth < 200; depth++) {
    const [parent] = await db.select().from(reactions).where(eq(reactions.id, current.parentReactionId)).limit(1);
    if (!parent) break;
    current = parent;
  }
  return current;
}

const fail = (error: string, field = "_form"): ReactionResult => ({ ok: false, error, errors: { [field]: [error] } });

/**
 * Phase 13: any brand reacts to a solo pitch, no permission needed — never
 * on a battle side (see CLAUDE-CODE-UEBERGABE.md §6). Zuschauer (Assent)
 * reagieren als „Community“ (Phase E).
 *
 * Luca 19.11. — Serie: Antworten (`parentReactionId`) gibt es nur noch
 * zwischen dem Ersteller des Originals und dem Autor der Reaktion. Antwortet
 * der Ersteller des Originals, entsteht eine Serie; danach dürfen beide
 * abwechselnd weiter antworten. Jede Antwort ist wie ein normaler Post:
 * Profil nötig (Zuschauer legen zuerst ein Creator-Profil an), Beschreibung
 * Pflicht, Link wie beim Posten (Creator optional). `soloPitchId` kommt bei
 * Antworten immer aus der Kette, nie aus dem Formular.
 */
export async function postReactionFor(user: { id: string }, formData: FormData): Promise<ReactionResult> {
  const soloPitchIdInput = formData.get("soloPitchId");
  const parentReactionIdInput = formData.get("parentReactionId");
  if (typeof soloPitchIdInput !== "string" || !soloPitchIdInput) return fail("Ungültige Anfrage.");
  const parentReactionId = typeof parentReactionIdInput === "string" && parentReactionIdInput ? parentReactionIdInput : null;

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    const [account] = await db.select({ accountType: users.accountType }).from(users).where(eq(users.id, user.id)).limit(1);
    if (account?.accountType !== "assent") return fail("Du musst zuerst eine Marke erstellen, um zu reagieren.");
  }

  const [pitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, soloPitchIdInput)).limit(1);
  if (!pitch) return fail("Dieser Pitch existiert nicht.");

  let soloPitchId = pitch.id;
  let parent: Reaction | null = null;
  let root: Reaction | null = null;
  if (parentReactionId) {
    [parent] = await db.select().from(reactions).where(eq(reactions.id, parentReactionId)).limit(1);
    if (!parent || !parent.soloPitchId) return fail("Diese Reaktion existiert nicht mehr.");
    const [rootPitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, parent.soloPitchId)).limit(1);
    if (!rootPitch) return fail("Dieser Pitch existiert nicht.");
    soloPitchId = rootPitch.id;
    root = await rootReactionOf(parent);
    const isOriginalOwner = myBrand !== null && rootPitch.brandId === myBrand.id;
    const isRootAuthor = root.userId === user.id || (root.brandId !== null && myBrand !== null && root.brandId === myBrand.id);
    if (!isOriginalOwner && !isRootAuthor) {
      return fail("Antworten kann nur der Ersteller des Originals — und danach die Person, auf deren Reaktion er geantwortet hat.");
    }
    const parentIsMine = parent.userId === user.id || (parent.brandId !== null && myBrand !== null && parent.brandId === myBrand.id);
    if (parentIsMine) return fail("Du kannst nicht auf deine eigene Antwort antworten.");
    if (!myBrand) return fail("Für eine Antwort in der Serie brauchst du ein Creator-Profil.", "creatorRequired");
  } else if (myBrand && pitch.brandId === myBrand.id) {
    return fail("Du kannst nicht auf deinen eigenen Pitch reagieren.");
  }

  const { allowed } = await checkRateLimit("reaction", myBrand ? myBrand.id : `user:${user.id}`);
  if (!allowed) return fail(RATE_LIMIT_MESSAGE);

  const video = await readVideoUrlField(formData, "reaction-videos", user.id);
  if ("error" in video) return fail(video.error, "video");

  const audioRights = AudioRightsSchema.safeParse({ audioRightsConfirmed: formData.get("audioRightsConfirmed") });
  if (!audioRights.success) return fail(Object.values(audioRights.error.flatten().fieldErrors)[0]![0], "audioRightsConfirmed");

  // Reaktion: Beschreibung optional, kein Link. Antwort in der Serie: wie ein Post.
  let description: string | null;
  let cta: { ctaLabel: string | null; ctaUrl: string | null; ctaCode: string | null } = { ctaLabel: null, ctaUrl: null, ctaCode: null };
  if (parent && myBrand) {
    const required = validateDescription(formData.get("description"));
    if ("error" in required) return fail(required.error, "description");
    description = required.description;
    const link = validateCtaLink(formData, { optional: myBrand.kind === "creator" });
    if ("errors" in link) return { ok: false, error: Object.values(link.errors)[0]?.[0] ?? "Bitte prüfe den Link.", errors: link.errors };
    cta = link;
  } else {
    const optional = optionalDescription(formData.get("description"));
    if ("error" in optional) return fail(optional.error, "description");
    description = optional.description;
  }

  const [inserted] = await db
    .insert(reactions)
    .values({
      soloPitchId,
      parentReactionId,
      ...(myBrand ? { brandId: myBrand.id } : { userId: user.id }),
      videoUrl: video.videoUrl,
      description,
      ...cta,
      paidPartnership: myBrand?.kind === "creator" && formData.get("paidPartnership") === "on",
      containsAiContent: formData.get("containsAiContent") === "on",
    })
    .returning({ id: reactions.id });

  // Luca 19.11.: wer eine Antwort bekommt, erfährt es — die Serie läuft weiter.
  if (parent && root && myBrand) {
    const recipients = parent.brandId ? await getBrandMemberUserIds(parent.brandId) : parent.userId ? [parent.userId] : [];
    const startsSeries = parent.id === root.id;
    await notifyUsers(
      recipients,
      startsSeries
        ? { de: `${myBrand.name} hat auf deine Reaktion geantwortet — eure Serie läuft.`, en: `${myBrand.name} replied to your reaction — your series is on.` }
        : { de: `${myBrand.name} hat in eurer Serie geantwortet.`, en: `${myBrand.name} replied in your series.` },
      `/?pitch=${soloPitchId}&series=${root.id}&reaction=${inserted.id}`,
      user.id,
      "comment",
    ).catch(() => {});
  }

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

/**
 * Luca 02.11./19.11.: eigene Reaktion bearbeiten — KI-Kennzeichnung,
 * Beschreibung und (nur Antworten in einer Serie) Link/Code wie bei Posts.
 * Fehlt ein Feld (ältere Apps), bleibt es unverändert.
 */
export async function updateOwnReactionFor(
  user: { id: string },
  reactionId: string,
  input: { containsAiContent?: unknown; description?: unknown; ctaLabel?: unknown; ctaUrl?: unknown; ctaCode?: unknown; paidPartnership?: unknown },
): Promise<{ ok: true } | { ok: false; error: string; errors?: Record<string, string[]> }> {
  const [reaction] = await db.select().from(reactions).where(eq(reactions.id, reactionId)).limit(1);
  if (!reaction) return { ok: false, error: "Diese Reaktion existiert nicht mehr." };
  const myBrand = reaction.brandId ? await getBrandForUser(user.id) : null;
  const own = reaction.userId === user.id || (reaction.brandId !== null && myBrand?.id === reaction.brandId);
  if (!own) return { ok: false, error: "Das ist nicht deine Reaktion." };

  const patch: Partial<typeof reactions.$inferInsert> = {};
  if (typeof input.containsAiContent === "boolean") patch.containsAiContent = input.containsAiContent;
  if (input.description !== undefined) {
    if (reaction.parentReactionId) {
      const required = validateDescription(input.description);
      if ("error" in required) return { ok: false, error: required.error, errors: { description: [required.error] } };
      patch.description = required.description;
    } else {
      const optional = optionalDescription(input.description);
      if ("error" in optional) return { ok: false, error: optional.error, errors: { description: [optional.error] } };
      patch.description = optional.description;
    }
  }
  if (reaction.parentReactionId && (input.ctaLabel !== undefined || input.ctaUrl !== undefined)) {
    const form = new FormData();
    form.set("ctaLabel", typeof input.ctaLabel === "string" ? input.ctaLabel : "");
    form.set("ctaUrl", typeof input.ctaUrl === "string" ? input.ctaUrl : "");
    form.set("ctaCode", typeof input.ctaCode === "string" ? input.ctaCode : "");
    const link = validateCtaLink(form, { optional: myBrand?.kind === "creator" });
    if ("errors" in link) return { ok: false, error: Object.values(link.errors)[0]?.[0] ?? "Bitte prüfe den Link.", errors: link.errors };
    Object.assign(patch, link);
  }
  if (typeof input.paidPartnership === "boolean" && myBrand?.kind === "creator") patch.paidPartnership = input.paidPartnership;
  if (Object.keys(patch).length > 0) await db.update(reactions).set(patch).where(eq(reactions.id, reactionId));
  return { ok: true };
}
