import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, creatorChallenges, type CreatorChallenge } from "@/db/schema";
import { getBrandForUser } from "@/lib/brand";
import { currentPeriod, periodLabel } from "@/lib/creator-charts";
import { getFeedSoloPitchesForChallenge, type FeedSoloPitch } from "@/lib/feed";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { createSoloPitchForUser } from "@/lib/solo-pitch";

// RN-7 (Luca 30.09.): Creator-Challenge. Eine Marke eröffnet sie für einen
// Kalendermonat; ihre Creator (andere Marken-Accounts) reichen je einen
// normalen Solo-Pitch ein, der im Feed läuft. Rangliste = Likes, am
// Monatsende stehen die Top 3 („Creator Winner Oktober 2026“).

const MAX_PROMPT_LENGTH = 200;
/** Wie viele Monate im Voraus eine Marke eröffnen darf (laufender + 2). */
const MONTHS_AHEAD = 2;

export type ChallengeStage = "upcoming" | "running" | "finished";

export function challengeStage(period: string): ChallengeStage {
  const now = currentPeriod();
  return period > now ? "upcoming" : period === now ? "running" : "finished";
}

/** Monate, für die eine Marke gerade eine Challenge eröffnen kann. */
export function openablePeriods(): { period: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: MONTHS_AHEAD + 1 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { period, label: periodLabel(period) };
  });
}

export type ChallengeResult = { ok: true; challengeId: string } | { ok: false; error: string };

export async function openChallengeFor(user: { id: string }, input: { period: unknown; prompt: unknown }): Promise<ChallengeResult> {
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) return { ok: false, error: "Du musst zuerst eine Marke erstellen." };

  const period = typeof input.period === "string" ? input.period : "";
  if (!openablePeriods().some((p) => p.period === period)) return { ok: false, error: "Bitte einen Monat wählen." };

  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt) return { ok: false, error: "Beschreibe kurz, was die Creator zeigen sollen." };
  if (prompt.length > MAX_PROMPT_LENGTH) return { ok: false, error: `Maximal ${MAX_PROMPT_LENGTH} Zeichen.` };

  const { allowed } = await checkRateLimit("challenge-open", myBrand.id);
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const [created] = await db
    .insert(creatorChallenges)
    .values({ brandId: myBrand.id, period, prompt })
    .onConflictDoNothing()
    .returning({ id: creatorChallenges.id });
  if (!created) return { ok: false, error: `Für ${periodLabel(period)} hast du schon eine Challenge.` };
  return { ok: true, challengeId: created.id };
}

export type ChallengeDetails = {
  challenge: CreatorChallenge;
  brand: { id: string; name: string; slug: string; logoUrl: string | null };
  stage: ChallengeStage;
  periodLabel: string;
  /** Rangliste: meiste Likes zuerst. Nach Monatsende sind die ersten drei die Gewinner. */
  entries: FeedSoloPitch[];
  isOwner: boolean;
  canSubmit: boolean;
  viewerSubmitted: boolean;
};

export async function getChallengeDetails(id: string, viewerId: string | null): Promise<ChallengeDetails | null> {
  const [row] = await db
    .select({ challenge: creatorChallenges, brand: { id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl } })
    .from(creatorChallenges)
    .innerJoin(brands, eq(creatorChallenges.brandId, brands.id))
    .where(eq(creatorChallenges.id, id))
    .limit(1);
  if (!row) return null;

  const [entries, viewerBrand] = await Promise.all([
    getFeedSoloPitchesForChallenge(viewerId, id),
    viewerId ? getBrandForUser(viewerId) : Promise.resolve(null),
  ]);
  const stage = challengeStage(row.challenge.period);
  const isOwner = viewerBrand?.id === row.brand.id;
  const viewerSubmitted = viewerBrand ? entries.some((e) => e.brandId === viewerBrand.id) : false;
  return {
    challenge: row.challenge,
    brand: row.brand,
    stage,
    periodLabel: periodLabel(row.challenge.period),
    entries,
    isOwner,
    viewerSubmitted,
    canSubmit: Boolean(viewerBrand) && !isOwner && !viewerSubmitted && stage === "running",
  };
}

/** Laufende und kommende Challenges einer Marke (fürs Profil), neueste Periode zuerst. */
export async function getOpenChallengesForBrand(brandId: string): Promise<CreatorChallenge[]> {
  return db
    .select()
    .from(creatorChallenges)
    .where(and(eq(creatorChallenges.brandId, brandId), gte(creatorChallenges.period, currentPeriod())))
    .orderBy(creatorChallenges.period);
}

/** Letzte beendete Challenge einer Marke (fürs Profil: „Creator Winner …“). */
export async function getLatestFinishedChallengeForBrand(brandId: string): Promise<CreatorChallenge | null> {
  const rows = await db
    .select()
    .from(creatorChallenges)
    .where(eq(creatorChallenges.brandId, brandId))
    .orderBy(desc(creatorChallenges.period));
  return rows.find((c) => challengeStage(c.period) === "finished") ?? null;
}

/** Laufende Challenges mehrerer Marken (Suche: „Marken, denen du folgst“). */
export async function getRunningChallengesForBrands(brandIds: string[]) {
  if (brandIds.length === 0) return [];
  return db
    .select({ id: creatorChallenges.id, prompt: creatorChallenges.prompt, period: creatorChallenges.period, brandName: brands.name, brandSlug: brands.slug, brandLogoUrl: brands.logoUrl })
    .from(creatorChallenges)
    .innerJoin(brands, eq(creatorChallenges.brandId, brands.id))
    .where(and(inArray(creatorChallenges.brandId, brandIds), eq(creatorChallenges.period, currentPeriod())));
}

/** Einreichen: ein normaler Solo-Pitch mit Verweis auf die Challenge (dieselben Pflichtfelder). */
export async function submitToChallengeFor(
  user: { id: string },
  challengeId: string,
  formData: FormData,
): Promise<{ ok: true; soloPitchId: string } | { ok: false; errors: Record<string, string[]> }> {
  const details = await getChallengeDetails(challengeId, user.id);
  if (!details) return { ok: false, errors: { _form: ["Diese Challenge gibt es nicht."] } };
  if (details.isOwner) return { ok: false, errors: { _form: ["Bei deiner eigenen Challenge kannst du nicht mitmachen."] } };
  if (details.viewerSubmitted) return { ok: false, errors: { _form: ["Du hast bei dieser Challenge schon ein Video eingereicht."] } };
  if (details.stage === "upcoming") return { ok: false, errors: { _form: [`Die Challenge startet erst im ${details.periodLabel}.`] } };
  if (details.stage === "finished") return { ok: false, errors: { _form: ["Diese Challenge ist beendet."] } };

  try {
    const result = await createSoloPitchForUser(user.id, formData, { creatorChallengeId: challengeId });
    if (!result.ok) return result;
    return { ok: true, soloPitchId: result.id };
  } catch {
    // Eindeutiger Index (Challenge, Marke): doppelt abgeschickt.
    return { ok: false, errors: { _form: ["Du hast bei dieser Challenge schon ein Video eingereicht."] } };
  }
}


/**
 * RN-7 (Luca 30.09.): die Marke löscht ihre eigene Challenge. Eingereichte
 * Posts bleiben als normale Solo-Pitches (creator_challenge_id → null).
 */
export async function deleteChallengeFor(user: { id: string }, challengeId: string): Promise<ChallengeResult> {
  const myBrand = await getBrandForUser(user.id);
  const [challenge] = await db.select().from(creatorChallenges).where(eq(creatorChallenges.id, challengeId)).limit(1);
  if (!challenge || !myBrand || challenge.brandId !== myBrand.id) {
    return { ok: false, error: "Nur die Marke selbst kann ihre Challenge löschen." };
  }
  await db.delete(creatorChallenges).where(eq(creatorChallenges.id, challengeId));
  return { ok: true, challengeId };
}
