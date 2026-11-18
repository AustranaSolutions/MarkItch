import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNull, lt } from "drizzle-orm";
import { getBrandMemberUserIds } from "@/lib/brand";
import { notifyUsers } from "@/lib/notification";
import { db } from "@/db";
import { partnerCastings, castingSubmissions, castingVotes, brands, brandMembers, type PartnerCasting } from "@/db/schema";
import { getAutoHiddenTargetIds } from "@/lib/moderation";

// Phase 19: same "starting assumption, not measured" spirit as
// PRODUCTION_WINDOW_MS/VOTING_WINDOW_MS in battle-format.ts. Submissions
// get as long as a scheduled Duell side does to produce a video; voting
// runs for a week once submissions close.
export const SUBMISSION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const CASTING_VOTING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type CastingStage =
  | { stage: "open"; deadline: Date }
  | { stage: "voting"; endsAt: Date }
  | { stage: "finished"; winnerBrandId: string | null };

/**
 * Derived from timestamps, not stored — same philosophy as
 * effectiveStatus()/getBattleStage() elsewhere in this codebase. A casting
 * with zero submissions when it "finishes" just has no winner, same as a
 * Duell's no_show.
 */
export function getCastingStage(
  casting: Pick<PartnerCasting, "submissionDeadline" | "votingEndsAt">,
  tally?: Map<string, number>,
  submissionBrandById?: Map<string, string>,
): CastingStage {
  const now = Date.now();
  if (casting.submissionDeadline.getTime() > now) {
    return { stage: "open", deadline: casting.submissionDeadline };
  }
  if (casting.votingEndsAt.getTime() > now) {
    return { stage: "voting", endsAt: casting.votingEndsAt };
  }
  if (!tally || !submissionBrandById || tally.size === 0) {
    return { stage: "finished", winnerBrandId: null };
  }
  let winningSubmissionId: string | null = null;
  let topVotes = -1;
  let tie = false;
  for (const [submissionId, n] of tally) {
    if (n > topVotes) {
      topVotes = n;
      winningSubmissionId = submissionId;
      tie = false;
    } else if (n === topVotes) {
      tie = true;
    }
  }
  const winnerBrandId = topVotes > 0 && !tie && winningSubmissionId ? (submissionBrandById.get(winningSubmissionId) ?? null) : null;
  return { stage: "finished", winnerBrandId };
}

export type CastingSubmissionWithBrand = {
  id: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  videoUrl: string;
  description: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  voteCount: number;
  containsAiContent: boolean;
};

export type CastingWithDetails = PartnerCasting & {
  hostBrand: { id: string; name: string; slug: string; logoUrl: string | null };
  submissions: CastingSubmissionWithBrand[];
  stage: CastingStage;
  viewerVotedSubmissionId: string | null;
};

const brandCols = { id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl };

export async function getCastingById(id: string, viewerId: string | null): Promise<CastingWithDetails | null> {
  await runReminders();
  const [casting] = await db.select().from(partnerCastings).where(eq(partnerCastings.id, id)).limit(1);
  if (!casting) return null;

  const [hostBrand] = await db.select(brandCols).from(brands).where(eq(brands.id, casting.hostBrandId)).limit(1);
  if (!hostBrand) return null;

  const [allSubmissionRows, autoHiddenIds] = await Promise.all([
    db
      .select({ submission: castingSubmissions, brand: brandCols })
      .from(castingSubmissions)
      .innerJoin(brands, eq(castingSubmissions.brandId, brands.id))
      .where(eq(castingSubmissions.castingId, id))
      .orderBy(desc(castingSubmissions.createdAt)),
    getAutoHiddenTargetIds(["casting_submission"]),
  ]);
  // Phase 46: siehe buildFeedDuels in feed.ts — mehrere unterschiedliche Meldende → automatisch pausiert.
  const submissionRows = allSubmissionRows.filter((r) => !autoHiddenIds.has(r.submission.id));

  const voteRows = await db
    .select({ submissionId: castingVotes.submissionId, n: count() })
    .from(castingVotes)
    .where(eq(castingVotes.castingId, id))
    .groupBy(castingVotes.submissionId);
  const tally = new Map(voteRows.map((r) => [r.submissionId, r.n]));
  const submissionBrandById = new Map(submissionRows.map((r) => [r.submission.id, r.brand.id]));

  const stage = getCastingStage(casting, tally, submissionBrandById);

  const viewerVote = viewerId
    ? await db
        .select({ submissionId: castingVotes.submissionId })
        .from(castingVotes)
        .where(and(eq(castingVotes.castingId, id), eq(castingVotes.userId, viewerId)))
        .limit(1)
    : [];

  return {
    ...casting,
    hostBrand,
    submissions: submissionRows.map((r) => ({
      id: r.submission.id,
      brandId: r.brand.id,
      brandName: r.brand.name,
      brandSlug: r.brand.slug,
      brandLogoUrl: r.brand.logoUrl,
      videoUrl: r.submission.videoUrl,
      description: r.submission.description,
      ctaLabel: r.submission.ctaLabel,
      ctaUrl: r.submission.ctaUrl,
      voteCount: tally.get(r.submission.id) ?? 0,
      containsAiContent: r.submission.containsAiContent,
    })),
    stage,
    viewerVotedSubmissionId: viewerVote[0]?.submissionId ?? null,
  };
}

/** A brand's own, still-relevant (open or voting) casting, if any — used to cap one active casting per brand at a time. */
export async function getActiveCastingForBrand(brandId: string): Promise<PartnerCasting | null> {
  await runReminders();
  const rows = await db
    .select()
    .from(partnerCastings)
    .where(eq(partnerCastings.hostBrandId, brandId))
    .orderBy(desc(partnerCastings.createdAt));
  return rows.find((c) => c.votingEndsAt.getTime() > Date.now()) ?? null;
}

/**
 * The most recently *finished* casting a brand hosted, if any — so a
 * visitor to that brand's profile can still see who won even after voting
 * closes (getActiveCastingForBrand alone would just go silent, since a
 * finished casting isn't "active" anymore).
 */
export async function getLatestFinishedCastingForBrand(brandId: string): Promise<CastingWithDetails | null> {
  const rows = await db
    .select()
    .from(partnerCastings)
    .where(eq(partnerCastings.hostBrandId, brandId))
    .orderBy(desc(partnerCastings.votingEndsAt));
  const finished = rows.find((c) => c.votingEndsAt.getTime() <= Date.now());
  return finished ? getCastingById(finished.id, null) : null;
}

/** Every finished casting a brand hosted and actually won, most recent first — for a "Partner von" badge. */
export async function getWonCastingsForBrand(brandId: string): Promise<CastingWithDetails[]> {
  const hostedRows = await db
    .select({ submission: castingSubmissions })
    .from(castingSubmissions)
    .where(eq(castingSubmissions.brandId, brandId));
  const castingIds = [...new Set(hostedRows.map((r) => r.submission.castingId))];
  if (castingIds.length === 0) return [];

  const details = await Promise.all(castingIds.map((id) => getCastingById(id, null)));
  return details.filter(
    (c): c is CastingWithDetails => c !== null && c.stage.stage === "finished" && c.stage.winnerBrandId === brandId,
  );
}

/** RN-7 (Luca 30.09.): Einreichfrist wählt die Marke — 7, 14 oder 30 Tage. */
export const CASTING_SUBMISSION_DAYS = [7, 14, 30] as const;

export async function createCasting(
  hostBrandId: string,
  prompt: string,
  submissionDays: number = SUBMISSION_WINDOW_MS / (24 * 60 * 60 * 1000),
): Promise<PartnerCasting> {
  const now = Date.now();
  const submissionMs = submissionDays * 24 * 60 * 60 * 1000;
  const [casting] = await db
    .insert(partnerCastings)
    .values({
      hostBrandId,
      prompt,
      submissionDeadline: new Date(now + submissionMs),
      votingEndsAt: new Date(now + submissionMs + CASTING_VOTING_WINDOW_MS),
    })
    .returning();
  return casting;
}

/** Darf diese Marke (noch) bei diesem Casting einreichen? */
export async function checkCastingSubmission(castingId: string, brandId: string): Promise<{ error?: string }> {
  const [casting] = await db.select().from(partnerCastings).where(eq(partnerCastings.id, castingId)).limit(1);
  if (!casting) return { error: "Dieses Casting existiert nicht." };
  if (casting.hostBrandId === brandId) return { error: "Du kannst nicht bei deinem eigenen Casting mitmachen." };
  if (casting.submissionDeadline.getTime() < Date.now()) return { error: "Die Einreichungsfrist ist abgelaufen." };
  const [existing] = await db
    .select({ id: castingSubmissions.id })
    .from(castingSubmissions)
    .where(and(eq(castingSubmissions.castingId, castingId), eq(castingSubmissions.brandId, brandId)))
    .limit(1);
  if (existing) return { error: "Du hast für dieses Casting bereits eingereicht." };
  return {};
}

export async function castCastingVote(userId: string, castingId: string, submissionId: string): Promise<{ error?: string }> {
  const [casting] = await db.select().from(partnerCastings).where(eq(partnerCastings.id, castingId)).limit(1);
  if (!casting) return { error: "Dieses Casting existiert nicht." };

  const stage = getCastingStage(casting);
  if (stage.stage !== "voting" && stage.stage !== "open") {
    return { error: "Die Abstimmung für dieses Casting ist beendet." };
  }

  const [submission] = await db
    .select()
    .from(castingSubmissions)
    .where(and(eq(castingSubmissions.id, submissionId), eq(castingSubmissions.castingId, castingId)))
    .limit(1);
  if (!submission) return { error: "Ungültige Einreichung." };

  // No voting for your own entry, and the host doesn't get to tip their
  // own scale either — same "not in your own battle" rule as Duell voting.
  const [ownMembership] = await db
    .select({ brandId: brandMembers.brandId })
    .from(brandMembers)
    .where(eq(brandMembers.userId, userId))
    .limit(1);
  if (ownMembership && (ownMembership.brandId === submission.brandId || ownMembership.brandId === casting.hostBrandId)) {
    return { error: "Du kannst bei diesem Casting nicht mitstimmen." };
  }

  const [existingVote] = await db
    .select({ id: castingVotes.id })
    .from(castingVotes)
    .where(and(eq(castingVotes.castingId, castingId), eq(castingVotes.userId, userId)))
    .limit(1);
  if (existingVote) return { error: "Du hast bereits abgestimmt." };

  await db.insert(castingVotes).values({ castingId, submissionId, userId }).onConflictDoNothing();
  return {};
}

/** Luca 18.11.: bei vielen Marken nicht endlos — gefolgte zuerst, dann die nächsten Fristen. */
export const OPEN_CASTINGS_LIMIT = 50;

export type OpenCasting = {
  id: string;
  prompt: string;
  /** „open“ = Einreichen läuft, „voting“ = Abstimmung läuft. */
  stage: "open" | "voting";
  /** Ende der aktuellen Phase. */
  deadline: Date;
  submissionDeadline: Date;
  submissionCount: number;
  hostBrand: { id: string; name: string; slug: string; logoUrl: string | null };
  /** Luca 18.11.: Marke, der man folgt → steht oben und zählt für die Zahl am Eingang. */
  followed: boolean;
};

/**
 * Luca 17.11. (Phasen-Map 4.3): alle laufenden Castings — von allen Marken,
 * nicht nur gefolgten. Erst die, bei denen man noch einreichen kann, dann die
 * in der Abstimmung; jeweils die Frist zuerst, die bald endet. Blockierte
 * Marken fehlen. (18.11.: vorher nur Einreichphase → Lucas Casting in der
 * Abstimmung fehlte.)
 */
export async function getOpenCastings(blockedBrandIds: Set<string> = new Set(), followedBrandIds: Set<string> = new Set()): Promise<OpenCasting[]> {
  await runReminders();
  const running = gt(partnerCastings.votingEndsAt, new Date());
  const base = () =>
    db.select({ casting: partnerCastings, brand: brandCols }).from(partnerCastings).innerJoin(brands, eq(partnerCastings.hostBrandId, brands.id));
  // Gefolgte Marken getrennt laden, damit sie bei vielen Marken nicht hinter dem Limit verschwinden.
  const [followedRows, nextRows] = await Promise.all([
    followedBrandIds.size ? base().where(and(running, inArray(partnerCastings.hostBrandId, [...followedBrandIds]))).limit(OPEN_CASTINGS_LIMIT) : Promise.resolve([]),
    base().where(running).orderBy(asc(partnerCastings.submissionDeadline)).limit(OPEN_CASTINGS_LIMIT * 2),
  ]);
  const seen = new Set<string>();
  const rows = [...followedRows, ...nextRows].filter((r) => (seen.has(r.casting.id) ? false : (seen.add(r.casting.id), true)));
  const visible = rows.filter((r) => !blockedBrandIds.has(r.brand.id));
  const ids = visible.map((r) => r.casting.id);
  const counts = ids.length
    ? await db
        .select({ castingId: castingSubmissions.castingId, n: count() })
        .from(castingSubmissions)
        .where(inArray(castingSubmissions.castingId, ids))
        .groupBy(castingSubmissions.castingId)
    : [];
  const byId = new Map(counts.map((c) => [c.castingId, Number(c.n)]));
  const now = Date.now();
  const list = visible.map((r) => {
    const open = r.casting.submissionDeadline.getTime() > now;
    return {
      id: r.casting.id,
      prompt: r.casting.prompt,
      stage: open ? ("open" as const) : ("voting" as const),
      deadline: open ? r.casting.submissionDeadline : r.casting.votingEndsAt,
      submissionDeadline: r.casting.submissionDeadline,
      submissionCount: byId.get(r.casting.id) ?? 0,
      hostBrand: r.brand,
      followed: followedBrandIds.has(r.brand.id),
    };
  });
  // Gefolgte Marken zuerst, darin: Einreichen vor Abstimmung, jeweils Frist zuerst.
  const rank = (c: OpenCasting) => (c.followed ? 0 : 2) + (c.stage === "open" ? 0 : 1);
  return list.sort((a, b) => rank(a) - rank(b) || a.deadline.getTime() - b.deadline.getTime()).slice(0, OPEN_CASTINGS_LIMIT);
}

/**
 * Luca 18.11.: nicht automatisch verlängern, sondern einen Tag vor Ende der
 * Einreichfrist die Marke erinnern — „Einreichen endet morgen (N Videos).
 * Verlängern?“. Antippen öffnet das Casting, dort kann sie bearbeiten und
 * verlängern. Einmal je Frist (reminder_sent_at; Verlängern setzt es zurück).
 * Läuft beim Laden von Casting-Listen/-Seiten/-Profilen und im täglichen Cron.
 */
export async function remindCastingsEndingSoon(): Promise<number> {
  const now = new Date();
  const due = await db
    .update(partnerCastings)
    .set({ reminderSentAt: now })
    .where(
      and(
        isNull(partnerCastings.reminderSentAt),
        gt(partnerCastings.submissionDeadline, now),
        lt(partnerCastings.submissionDeadline, new Date(now.getTime() + 24 * 60 * 60 * 1000)),
      ),
    )
    .returning({ id: partnerCastings.id, hostBrandId: partnerCastings.hostBrandId, prompt: partnerCastings.prompt });
  for (const c of due) {
    const [{ n }] = await db.select({ n: count() }).from(castingSubmissions).where(eq(castingSubmissions.castingId, c.id));
    const short = c.prompt.length > 60 ? `${c.prompt.slice(0, 57)}…` : c.prompt;
    const videos = Number(n);
    await notifyUsers(
      await getBrandMemberUserIds(c.hostBrandId),
      {
        de: `Dein Casting „${short}“: Einreichen endet morgen (${videos === 1 ? "1 Video" : `${videos} Videos`}). Verlängern? Tippe hier.`,
        en: `Your casting “${short}”: submissions close tomorrow (${videos === 1 ? "1 video" : `${videos} videos`}). Extend? Tap here.`,
      },
      `/castings/${c.id}`,
    );
  }
  return due.length;
}

/**
 * Luca 18.11.: Einreichfrist vorbei → alle Bewerber erfahren, dass die
 * Abstimmung läuft (damit sie ihre Follower holen), die Marke bekommt die Zahl
 * der Videos — oder, wenn niemand eingereicht hat, den Hinweis aufs Verlängern.
 * Einmal je Frist (voting_notified_at; Verlängern setzt es zurück).
 */
export async function notifyCastingVotingStarted(): Promise<number> {
  const now = new Date();
  const due = await db
    .update(partnerCastings)
    .set({ votingNotifiedAt: now })
    .where(and(isNull(partnerCastings.votingNotifiedAt), lt(partnerCastings.submissionDeadline, now), gt(partnerCastings.votingEndsAt, now)))
    .returning({ id: partnerCastings.id, hostBrandId: partnerCastings.hostBrandId, prompt: partnerCastings.prompt });
  for (const c of due) {
    const short = c.prompt.length > 60 ? `${c.prompt.slice(0, 57)}…` : c.prompt;
    const [host] = await db.select({ name: brands.name }).from(brands).where(eq(brands.id, c.hostBrandId)).limit(1);
    const entries = await db.select({ brandId: castingSubmissions.brandId }).from(castingSubmissions).where(eq(castingSubmissions.castingId, c.id));
    const applicantUserIds = (await Promise.all(entries.map((e) => getBrandMemberUserIds(e.brandId)))).flat();
    if (applicantUserIds.length) {
      await notifyUsers(
        applicantUserIds,
        {
          de: `Die Abstimmung im Casting von ${host?.name ?? "der Marke"} läuft! Teile dein Video, damit deine Follower für dich stimmen.`,
          en: `Voting in ${host?.name ?? "the brand"}’s casting is open! Share your video so your followers vote for you.`,
        },
        `/castings/${c.id}`,
      );
    }
    const n = entries.length;
    await notifyUsers(
      await getBrandMemberUserIds(c.hostBrandId),
      n > 0
        ? {
            de: `Dein Casting „${short}“: ${n === 1 ? "1 Bewerbung" : `${n} Bewerbungen`} – jetzt stimmt die Community ab. Am Ende entscheidest du, mit wem du zusammenarbeitest.`,
            en: `Your casting “${short}”: ${n === 1 ? "1 application" : `${n} applications`} – the community is voting now. In the end, you decide who you work with.`,
          }
        : {
            de: `Bei deinem Casting „${short}“ hat niemand eingereicht. Du kannst es verlängern – tippe hier.`,
            en: `No one applied to your casting “${short}”. You can extend it – tap here.`,
          },
      `/castings/${c.id}`,
    );
  }
  return due.length;
}

function runReminders() {
  return Promise.all([remindCastingsEndingSoon(), notifyCastingVotingStarted()]).catch((err) => console.error("[casting] reminders", err));
}
