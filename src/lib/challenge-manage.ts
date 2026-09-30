import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles, challenges, soloPitches } from "@/db/schema";
import { getBrandForUser, getBrandMemberUserIds } from "@/lib/brand";
import { CHALLENGE_WINDOW_MS, effectiveStatus, getLivePendingChallengeBetween } from "@/lib/challenge";
import { DUEL_CATEGORIES, PRODUCTION_WINDOW_MS, type DuelCategory } from "@/lib/battle-format";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { activateBattleIfBothSidesReady } from "@/lib/battle-stage";
import { readVideoUrlField } from "@/lib/storage";
import { validateCtaLink } from "@/lib/cta-link";
import { AudioRightsSchema } from "@/lib/validation";

// RN-5b: Duell-Einladungen — gemeinsam genutzt von den Web-Actions
// (actions/challenge.ts) und den App-Routen (/api/mobile/challenges*).
// Rückgabe `{ error }` bei Ablehnung, sonst `{ ok: true }`.

export type ChallengeResult = { ok: true; battleId?: string } | { ok: false; error: string };

/** Shared by both "send a challenge" actions below. */
function parseCategory(category: unknown): DuelCategory | { error: string } {
  if (typeof category !== "string" || !DUEL_CATEGORIES.includes(category as DuelCategory)) {
    return { error: "Bitte eine Kategorie wählen." };
  }
  return category as DuelCategory;
}

/**
 * RN-7 (Luca 30.09.): optional schickt die einladende Marke ihr Duell-Video
 * gleich mit (dieselben Felder wie beim Duell-Video: Video, Link,
 * Musikrechte, KI). Kein Video = wie bisher, Upload nach der Annahme.
 */
type ChallengerVideo =
  | { challengerVideoUrl: string; challengerCtaLabel: string; challengerCtaUrl: string; challengerContainsAiContent: boolean }
  | Record<string, never>;

function parseChallengerVideo(video: FormData | null | undefined): ChallengerVideo | { error: string } {
  if (!video || !video.get("videoUrl")) return {};
  const parsed = readVideoUrlField(video, "battle-videos");
  if ("error" in parsed) return { error: parsed.error };
  const cta = validateCtaLink(video);
  if ("errors" in cta) return { error: Object.values(cta.errors)[0]![0] };
  const audio = AudioRightsSchema.safeParse({ audioRightsConfirmed: video.get("audioRightsConfirmed") });
  if (!audio.success) return { error: Object.values(audio.error.flatten().fieldErrors)[0]![0] };
  return {
    challengerVideoUrl: parsed.videoUrl,
    challengerCtaLabel: cta.ctaLabel,
    challengerCtaUrl: cta.ctaUrl,
    challengerContainsAiContent: video.get("containsAiContent") === "on",
  };
}

/** Brand A challenges Brand B. Triggered from B's public profile page. */
export async function sendChallengeFor(
  user: { id: string },
  input: { challengedBrandId: unknown; category: unknown; video?: FormData | null },
): Promise<ChallengeResult> {
  const challengedBrandId = input.challengedBrandId;
  if (typeof challengedBrandId !== "string" || !challengedBrandId) {
    return { ok: false, error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du musst zuerst eine Marke erstellen, um einzuladen." };
  }
  if (myBrand.id === challengedBrandId) {
    return { ok: false, error: "Du kannst deine eigene Marke nicht einladen." };
  }

  const existing = await getLivePendingChallengeBetween(myBrand.id, challengedBrandId);
  if (existing) {
    return { ok: false, error: "Zwischen euch läuft bereits eine offene Einladung." };
  }

  const category = parseCategory(input.category);
  if (typeof category === "object") return { ok: false, error: category.error };

  const challengerVideo = parseChallengerVideo(input.video);
  if ("error" in challengerVideo) return { ok: false, error: challengerVideo.error as string };

  const { allowed } = await checkRateLimit("challenge", myBrand.id);
  if (!allowed) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  await db.insert(challenges).values({
    challengerBrandId: myBrand.id,
    challengedBrandId,
    category,
    status: "pending",
    expiresAt: new Date(Date.now() + CHALLENGE_WINDOW_MS),
    ...challengerVideo,
  });

  await notifyChallenge(challengedBrandId, user.id);

  return { ok: true };
}

/**
 * Phase 43: challenger and challenged brand's members never heard anything
 * about an invitation at all — Luca: "die Info dass ich zum Duell
 * eingeladen habe kommt beim anderen nicht an". Shared by both send paths
 * (a plain profile challenge and "Pitch schicken" off a solo pitch).
 */
async function notifyChallenge(challengedBrandId: string, challengerUserId: string): Promise<void> {
  const [memberIds, actor] = await Promise.all([
    getBrandMemberUserIds(challengedBrandId),
    getActorLabel(challengerUserId),
  ]);
  await notifyUsers(
    memberIds,
    `${actor.label} hat dich zu einem Duell herausgefordert.`,
    "/profile/settings#einladungen",
    challengerUserId,
  );
}

/**
 * Phase 13: "Pitch schicken" — a formal challenge sent straight off a solo
 * pitch, not from a brand profile. challengedBrandId is always that pitch's
 * own brand; on acceptance, respondToChallenge below prefills the
 * challenged side's video from the pitch itself, since it was already
 * public (see CLAUDE-CODE-UEBERGABE.md §6 — the old "verdeckt" fairness
 * rule doesn't apply here).
 */
export async function sendChallengeFromSoloPitchFor(
  user: { id: string },
  input: { soloPitchId: unknown; category: unknown; video?: FormData | null },
): Promise<ChallengeResult> {
  const soloPitchId = input.soloPitchId;
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return { ok: false, error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du musst zuerst eine Marke erstellen, um einen Pitch zu schicken." };
  }

  const [pitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch) {
    return { ok: false, error: "Dieser Pitch existiert nicht." };
  }
  if (pitch.brandId === myBrand.id) {
    return { ok: false, error: "Du kannst deinen eigenen Pitch nicht herausfordern." };
  }

  const existing = await getLivePendingChallengeBetween(myBrand.id, pitch.brandId);
  if (existing) {
    return { ok: false, error: "Zwischen euch läuft bereits eine offene Einladung." };
  }

  const category = parseCategory(input.category);
  if (typeof category === "object") return { ok: false, error: category.error };

  const challengerVideo = parseChallengerVideo(input.video);
  if ("error" in challengerVideo) return { ok: false, error: challengerVideo.error as string };

  const { allowed } = await checkRateLimit("challenge", myBrand.id);
  if (!allowed) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  await db.insert(challenges).values({
    challengerBrandId: myBrand.id,
    challengedBrandId: pitch.brandId,
    soloPitchId: pitch.id,
    category,
    status: "pending",
    expiresAt: new Date(Date.now() + CHALLENGE_WINDOW_MS),
    ...challengerVideo,
  });

  await notifyChallenge(pitch.brandId, user.id);

  return { ok: true };
}

/** The challenger withdraws their own still-pending invitation. */
export async function cancelChallengeFor(user: { id: string }, challengeId: unknown): Promise<ChallengeResult> {
  if (typeof challengeId !== "string" || !challengeId) {
    return { ok: false, error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du hast keine Marke." };
  }

  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge || challenge.challengerBrandId !== myBrand.id) {
    return { ok: false, error: "Diese Einladung existiert nicht für deine Marke." };
  }
  if (effectiveStatus(challenge) !== "pending") {
    return { ok: false, error: "Diese Einladung ist nicht mehr offen." };
  }

  await db
    .update(challenges)
    .set({ status: "cancelled", respondedAt: new Date() })
    .where(eq(challenges.id, challengeId));

  const [challengedMemberIds, actor] = await Promise.all([
    getBrandMemberUserIds(challenge.challengedBrandId),
    getActorLabel(user.id),
  ]);
  await notifyUsers(challengedMemberIds, `${actor.label} hat die Duell-Einladung zurückgezogen.`, null, user.id);

  return { ok: true };
}

/** The challenged brand accepts or declines. */
export async function respondToChallengeFor(
  user: { id: string },
  challengeId: unknown,
  decision: unknown,
): Promise<ChallengeResult> {
  if (typeof challengeId !== "string" || (decision !== "accept" && decision !== "decline")) {
    return { ok: false, error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { ok: false, error: "Du hast keine Marke." };
  }

  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge || challenge.challengedBrandId !== myBrand.id) {
    return { ok: false, error: "Diese Einladung existiert nicht für deine Marke." };
  }

  const status = effectiveStatus(challenge);
  if (status === "expired") {
    // Persist the expiry so it stops showing up as actionable.
    await db.update(challenges).set({ status: "expired" }).where(eq(challenges.id, challengeId));
    return { ok: false, error: "Diese Einladung ist abgelaufen — das Zeitfenster ist vorbei." };
  }
  if (status !== "pending") {
    return { ok: false, error: "Auf diese Einladung wurde bereits reagiert." };
  }

  await db
    .update(challenges)
    .set({ status: decision === "accept" ? "accepted" : "declined", respondedAt: new Date() })
    .where(eq(challenges.id, challengeId));

  const [challengerMemberIds, actor] = await Promise.all([
    getBrandMemberUserIds(challenge.challengerBrandId),
    getActorLabel(user.id),
  ]);

  // Phase 7: accepting a challenge creates the battle row right away, but
  // it starts in "awaiting_videos" — no videos yet, nothing votable, nobody
  // notified. Both brands now have PRODUCTION_WINDOW_MS to each upload
  // their own video via uploadBattleVideo (src/app/actions/battle.ts),
  // which is also what flips it into "voting" and fires the "battle is
  // live" notification once both sides are in. Deliberately verdeckt: the
  // point is neither side can see (or react to) the other's video before
  // posting their own.
  //
  // Phase 13: unless this challenge came from "Pitch schicken" on a solo
  // pitch (challenge.soloPitchId set) — then the challenged brand's side is
  // already public, so it's prefilled at creation and only the challenger
  // (brandA) has to upload. uploadBattleVideo/activateBattleIfBothSidesReady
  // need no changes for this: a battle with one side already filled behaves
  // exactly like one where that side uploaded first, same as today.
  let acceptedBattleId: string | undefined;
  if (decision === "accept") {
    let prefilledBrandBVideo: Partial<typeof battles.$inferInsert> = {};
    if (challenge.soloPitchId) {
      const [pitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, challenge.soloPitchId)).limit(1);
      if (pitch) {
        prefilledBrandBVideo = {
          brandBVideoUrl: pitch.videoUrl,
          brandBSubmittedAt: pitch.createdAt,
          // RN-7: Link + KI-Kennzeichnung des Pitches gehören mit ins Duell.
          brandBCtaLabel: pitch.ctaLabel,
          brandBCtaUrl: pitch.ctaUrl,
          brandBContainsAiContent: pitch.containsAiContent,
        };
      }
    }
    // RN-7: mitgeschicktes Video der einladenden Marke = A-Seite.
    const prefilledBrandAVideo: Partial<typeof battles.$inferInsert> = challenge.challengerVideoUrl
      ? {
          brandAVideoUrl: challenge.challengerVideoUrl,
          brandASubmittedAt: challenge.createdAt,
          brandACtaLabel: challenge.challengerCtaLabel,
          brandACtaUrl: challenge.challengerCtaUrl,
          brandAContainsAiContent: challenge.challengerContainsAiContent,
        }
      : {};
    const [battle] = await db
      .insert(battles)
      .values({
        challengeId: challenge.id,
        brandAId: challenge.challengerBrandId,
        brandBId: challenge.challengedBrandId,
        mode: "scheduled",
        category: challenge.category,
        productionDeadline: new Date(Date.now() + PRODUCTION_WINDOW_MS),
        ...prefilledBrandBVideo,
        ...prefilledBrandAVideo,
      })
      .returning({ id: battles.id });
    acceptedBattleId = battle.id;

    // Beide Seiten schon da (Pitch + mitgeschicktes Video) → sofort live.
    await activateBattleIfBothSidesReady(battle.id);
    await notifyUsers(
      challengerMemberIds,
      challenge.challengerVideoUrl
        ? `${actor.label} hat deine Duell-Einladung angenommen — euer Video ist schon drin!`
        : `${actor.label} hat deine Duell-Einladung angenommen — jetzt dein Video hochladen!`,
      `/pitches/${battle.id}`,
      user.id,
    );
  } else {
    await notifyUsers(
      challengerMemberIds,
      `${actor.label} hat deine Duell-Einladung abgelehnt.`,
      "/profile/settings#einladungen",
      user.id,
    );
  }

  return { ok: true, battleId: acceptedBattleId };
}
