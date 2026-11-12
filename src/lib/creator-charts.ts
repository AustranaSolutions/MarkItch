import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorSubmissions, creatorVotes, brands, brandMembers } from "@/db/schema";
import { getAutoHiddenTargetIds } from "@/lib/moderation";

/** "YYYY-MM" — the calendar month IS the round, nothing to schedule. */
export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function periodLabel(period: string, lang: "de" | "en" = "de"): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(lang === "en" ? "en-US" : "de-DE", { month: "long", year: "numeric" });
}

export type CreatorChartEntry = {
  submissionId: string;
  creatorBrandId: string;
  creatorName: string;
  creatorSlug: string;
  creatorLogoUrl: string | null;
  videoUrl: string;
  description: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  voteCount: number;
  createdAt: string; // ISO
  containsAiContent: boolean;
};

const brandCols = { id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl };

export async function getChartForBrand(
  brandId: string,
  period: string,
  viewerId: string | null,
): Promise<{ entries: CreatorChartEntry[]; viewerVotedSubmissionId: string | null }> {
  const [allRows, autoHiddenIds] = await Promise.all([
    db
      .select({ submission: creatorSubmissions, creator: brandCols })
      .from(creatorSubmissions)
      .innerJoin(brands, eq(creatorSubmissions.creatorBrandId, brands.id))
      .where(and(eq(creatorSubmissions.brandId, brandId), eq(creatorSubmissions.period, period)))
      .orderBy(desc(creatorSubmissions.createdAt)),
    getAutoHiddenTargetIds(["creator_submission"]),
  ]);
  // Phase 46: siehe buildFeedDuels in feed.ts — mehrere unterschiedliche Meldende → automatisch pausiert.
  const rows = allRows.filter((r) => !autoHiddenIds.has(r.submission.id));

  if (rows.length === 0) return { entries: [], viewerVotedSubmissionId: null };

  const voteRows = await db
    .select({ submissionId: creatorVotes.submissionId, n: count() })
    .from(creatorVotes)
    .where(and(eq(creatorVotes.brandId, brandId), eq(creatorVotes.period, period)))
    .groupBy(creatorVotes.submissionId);
  const tally = new Map(voteRows.map((r) => [r.submissionId, r.n]));

  const viewerVote = viewerId
    ? await db
        .select({ submissionId: creatorVotes.submissionId })
        .from(creatorVotes)
        .where(and(eq(creatorVotes.brandId, brandId), eq(creatorVotes.period, period), eq(creatorVotes.userId, viewerId)))
        .limit(1)
    : [];

  const entries = rows
    .map((r): CreatorChartEntry => ({
      submissionId: r.submission.id,
      creatorBrandId: r.creator.id,
      creatorName: r.creator.name,
      creatorSlug: r.creator.slug,
      creatorLogoUrl: r.creator.logoUrl,
      videoUrl: r.submission.videoUrl,
      description: r.submission.description,
      ctaLabel: r.submission.ctaLabel,
      ctaUrl: r.submission.ctaUrl,
      voteCount: tally.get(r.submission.id) ?? 0,
      createdAt: r.submission.createdAt.toISOString(),
      containsAiContent: r.submission.containsAiContent,
    }))
    .sort((a, b) => b.voteCount - a.voteCount);

  return { entries, viewerVotedSubmissionId: viewerVote[0]?.submissionId ?? null };
}

/** Every past month this brand has a chart for, most recent first — for an "Archiv" list. */
export async function getChartPeriodsForBrand(brandId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ period: creatorSubmissions.period })
    .from(creatorSubmissions)
    .where(eq(creatorSubmissions.brandId, brandId));
  return rows.map((r) => r.period).sort((a, b) => (a < b ? 1 : -1));
}

export async function postCreatorSubmission(
  creatorBrandId: string,
  targetBrandId: string,
  videoUrl: string,
  description: string,
  ctaLabel: string,
  ctaUrl: string,
  containsAiContent: boolean,
): Promise<{ error?: string }> {
  if (creatorBrandId === targetBrandId) {
    return { error: "Du kannst kein Video für deine eigene Marke posten." };
  }
  const [targetBrand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, targetBrandId)).limit(1);
  if (!targetBrand) {
    return { error: "Diese Marke existiert nicht." };
  }
  await db
    .insert(creatorSubmissions)
    .values({ brandId: targetBrandId, creatorBrandId, videoUrl, description, ctaLabel, ctaUrl, containsAiContent, period: currentPeriod() });
  return {};
}

export async function castCreatorVote(userId: string, submissionId: string): Promise<{ error?: string }> {
  const [submission] = await db.select().from(creatorSubmissions).where(eq(creatorSubmissions.id, submissionId)).limit(1);
  if (!submission) return { error: "Dieses Video existiert nicht." };
  if (submission.period !== currentPeriod()) {
    return { error: "Diese Runde ist beendet — abstimmen geht nur in der laufenden Runde." };
  }

  // Same "not in your own battle" rule as everywhere else voting happens:
  // neither the promoted brand nor any creator competing this round votes
  // in their own round.
  const [ownMembership] = await db
    .select({ brandId: brandMembers.brandId })
    .from(brandMembers)
    .where(eq(brandMembers.userId, userId))
    .limit(1);
  if (ownMembership) {
    if (ownMembership.brandId === submission.brandId) {
      return { error: "Du kannst bei Videos über deine eigene Marke nicht mitstimmen." };
    }
    const [ownSubmissionThisRound] = await db
      .select({ id: creatorSubmissions.id })
      .from(creatorSubmissions)
      .where(
        and(
          eq(creatorSubmissions.brandId, submission.brandId),
          eq(creatorSubmissions.period, submission.period),
          eq(creatorSubmissions.creatorBrandId, ownMembership.brandId),
        ),
      )
      .limit(1);
    if (ownSubmissionThisRound) {
      return { error: "Du kannst nicht mitstimmen, wenn du selbst in dieser Runde mitmachst." };
    }
  }

  const [existingVote] = await db
    .select({ id: creatorVotes.id })
    .from(creatorVotes)
    .where(and(eq(creatorVotes.brandId, submission.brandId), eq(creatorVotes.period, submission.period), eq(creatorVotes.userId, userId)))
    .limit(1);
  if (existingVote) return { error: "Du hast in dieser Runde bereits abgestimmt." };

  await db
    .insert(creatorVotes)
    .values({ submissionId, brandId: submission.brandId, period: submission.period, userId })
    .onConflictDoNothing();
  return {};
}
