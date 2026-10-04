import "server-only";
import { and, countDistinct, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireUser } from "@/lib/session";
import {
  battles,
  brandMembers,
  brands,
  castingSubmissions,
  comments,
  creatorSubmissions,
  reactions,
  reports,
  soloPitches,
  users,
} from "@/db/schema";

// Phase 24: moderation. Everything a report can point at — kept as a plain
// union of strings (same "no DB enum" style as the rest of this file), not
// tied 1:1 to a table: 'battle_a'/'battle_b' both point at the same
// `battles` row, just a different side's video.
export type ReportTargetType =
  | "solo_pitch"
  | "reaction"
  | "comment"
  | "battle_a"
  | "battle_b"
  | "casting_submission"
  | "creator_submission"
  | "brand";

export const REPORT_TARGET_TYPES: ReportTargetType[] = [
  "solo_pitch",
  "reaction",
  "comment",
  "battle_a",
  "battle_b",
  "casting_submission",
  "creator_submission",
  "brand",
];

export const REPORT_REASONS = [
  "Unangemessener Inhalt",
  "Spam oder Betrug",
  "Beleidigung oder Belästigung",
  "Urheberrechtsverletzung",
  "Sonstiges",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

const MAX_NOTE_LENGTH = 500;

/**
 * Gates /admin/moderation — a comma-separated allowlist of emails in
 * ADMIN_EMAILS (Vercel env var, same "no new infra" style as
 * ADMIN_SEED_KEY), checked against the logged-in session's email. No
 * separate admin role/table for one page.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/** Shared gate for every /admin/* page and server action — bounces anyone not on the ADMIN_EMAILS allowlist back to the feed. */
export async function requireAdminUser() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) {
    redirect("/");
  }
  return user;
}

export async function submitReport(input: {
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!REPORT_TARGET_TYPES.includes(input.targetType)) {
    return { ok: false, error: "Ungültige Anfrage." };
  }
  if (!REPORT_REASONS.includes(input.reason as ReportReason)) {
    return { ok: false, error: "Bitte wähle einen Grund." };
  }
  const note = input.note?.trim().slice(0, MAX_NOTE_LENGTH) || null;

  await db.insert(reports).values({
    reporterUserId: input.reporterUserId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    note,
  });
  return { ok: true };
}

// Phase 46: Rechtskonformitäts-Audit — die PDF verlangt, gemeldete Inhalte
// automatisch bis zur Überprüfung zu pausieren. Ein einzelner Report reicht
// dafür nicht (Missbrauchsrisiko: Konkurrenz meldet massenhaft, um fremden
// Content offline zu nehmen) — erst ab mehreren *unterschiedlichen*
// Meldenden gilt ein Inhalt als pausiert. Bewusst zur Lesezeit berechnet,
// nicht als Spalte gespeichert (gleiche Philosophie wie effectiveStatus()
// in challenge.ts) — sobald ein Admin genug der offenen Reports auflöst,
// taucht der Inhalt beim nächsten Laden von selbst wieder auf, ohne eigene
// "un-hide"-Logik.
export const AUTO_HIDE_REPORT_THRESHOLD = 3;

// Audit 04.10. (H4): Nur Meldungen von Konten, die mindestens so alt sind,
// zählen für das automatische Pausieren — sonst könnte eine Marke das Video
// des Gegners mit drei frisch angelegten Konten aus dem Feed nehmen. Jede
// Meldung landet trotzdem in der Admin-Liste.
export const AUTO_HIDE_MIN_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * IDs, die für einen oder mehrere targetTypes mindestens
 * AUTO_HIDE_REPORT_THRESHOLD offene Meldungen von unterschiedlichen Nutzern
 * haben — von den aufrufenden Feed-/Listen-Abfragen herausgefiltert.
 * 'battle_a'/'battle_b' werden zusammen übergeben, weil beide auf dieselbe
 * battles-Zeile zeigen (siehe ReportTargetType-Kommentar oben) — ein Duell
 * mit insgesamt genug Meldungen über beide Seiten hinweg verschwindet als
 * Ganzes, nicht nur eine Seite davon.
 */
export async function getAutoHiddenTargetIds(
  targetTypes: ReportTargetType[],
  minDistinctReporters = AUTO_HIDE_REPORT_THRESHOLD,
): Promise<Set<string>> {
  const rows = await db
    .select({ targetId: reports.targetId, n: countDistinct(reports.reporterUserId) })
    .from(reports)
    .innerJoin(users, eq(reports.reporterUserId, users.id))
    .where(
      and(
        inArray(reports.targetType, targetTypes),
        eq(reports.status, "open"),
        lte(users.createdAt, new Date(Date.now() - AUTO_HIDE_MIN_ACCOUNT_AGE_MS)),
      ),
    )
    .groupBy(reports.targetId)
    .having(sql`count(distinct ${reports.reporterUserId}) >= ${minDistinctReporters}`);
  return new Set(rows.map((r) => r.targetId));
}

export type ReportedOwner = { userId: string; email: string };

async function getBrandOwners(brandId: string): Promise<ReportedOwner[]> {
  const rows = await db
    .select({ userId: brandMembers.userId, email: users.email })
    .from(brandMembers)
    .innerJoin(users, eq(brandMembers.userId, users.id))
    .where(eq(brandMembers.brandId, brandId));
  return rows;
}

type ResolvedTarget = { label: string; href: string | null; owners: ReportedOwner[] };

/** Looks up what a report actually points at, for the admin list — the content may already be gone. */
async function resolveTarget(targetType: ReportTargetType, targetId: string): Promise<ResolvedTarget> {
  switch (targetType) {
    case "solo_pitch": {
      const [row] = await db
        .select({ brandId: soloPitches.brandId, brandName: brands.name, brandSlug: brands.slug })
        .from(soloPitches)
        .innerJoin(brands, eq(soloPitches.brandId, brands.id))
        .where(eq(soloPitches.id, targetId))
        .limit(1);
      if (!row) return { label: "Solo-Pitch (bereits entfernt)", href: null, owners: [] };
      return { label: `Solo-Pitch von ${row.brandName}`, href: `/brands/${row.brandSlug}`, owners: await getBrandOwners(row.brandId) };
    }
    case "reaction": {
      const [row] = await db
        .select({ brandId: reactions.brandId, brandName: brands.name, brandSlug: brands.slug })
        .from(reactions)
        .innerJoin(brands, eq(reactions.brandId, brands.id))
        .where(eq(reactions.id, targetId))
        .limit(1);
      if (!row) return { label: "Reaktion (bereits entfernt)", href: null, owners: [] };
      return { label: `Reaktion von ${row.brandName}`, href: `/brands/${row.brandSlug}`, owners: await getBrandOwners(row.brandId) };
    }
    case "comment": {
      const [row] = await db
        .select({ content: comments.content, userId: comments.userId, email: users.email })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, targetId))
        .limit(1);
      if (!row) return { label: "Kommentar (bereits entfernt)", href: null, owners: [] };
      return {
        label: `Kommentar von ${row.email}: „${row.content.slice(0, 80)}“`,
        href: null,
        owners: [{ userId: row.userId, email: row.email }],
      };
    }
    case "battle_a":
    case "battle_b": {
      const [row] = await db
        .select({ brandAId: battles.brandAId, brandBId: battles.brandBId })
        .from(battles)
        .where(eq(battles.id, targetId))
        .limit(1);
      if (!row) return { label: "Duell (bereits entfernt)", href: null, owners: [] };
      const brandId = targetType === "battle_a" ? row.brandAId : row.brandBId;
      return { label: `Duell-Seite (/battles/${targetId})`, href: `/battles/${targetId}`, owners: await getBrandOwners(brandId) };
    }
    case "casting_submission": {
      const [row] = await db
        .select({ brandId: castingSubmissions.brandId, brandName: brands.name, brandSlug: brands.slug, castingId: castingSubmissions.castingId })
        .from(castingSubmissions)
        .innerJoin(brands, eq(castingSubmissions.brandId, brands.id))
        .where(eq(castingSubmissions.id, targetId))
        .limit(1);
      if (!row) return { label: "Casting-Einreichung (bereits entfernt)", href: null, owners: [] };
      return {
        label: `Casting-Einreichung von ${row.brandName}`,
        href: `/castings/${row.castingId}`,
        owners: await getBrandOwners(row.brandId),
      };
    }
    case "creator_submission": {
      const [row] = await db
        .select({ creatorBrandId: creatorSubmissions.creatorBrandId, brandName: brands.name, brandSlug: brands.slug })
        .from(creatorSubmissions)
        .innerJoin(brands, eq(creatorSubmissions.creatorBrandId, brands.id))
        .where(eq(creatorSubmissions.id, targetId))
        .limit(1);
      if (!row) return { label: "Creator-Video (bereits entfernt)", href: null, owners: [] };
      return {
        label: `Creator-Video von ${row.brandName}`,
        href: `/brands/${row.brandSlug}`,
        owners: await getBrandOwners(row.creatorBrandId),
      };
    }
    case "brand": {
      const [row] = await db.select({ name: brands.name, slug: brands.slug }).from(brands).where(eq(brands.id, targetId)).limit(1);
      if (!row) return { label: "Marke (bereits entfernt)", href: null, owners: [] };
      return { label: `Marke „${row.name}“`, href: `/brands/${row.slug}`, owners: await getBrandOwners(targetId) };
    }
  }
}

export type ReportWithTarget = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  note: string | null;
  createdAt: Date;
  reporterEmail: string;
  targetLabel: string;
  targetHref: string | null;
  targetOwners: ReportedOwner[];
};

/** Newest first — same as everywhere else a queue is shown. */
export async function getOpenReports(): Promise<ReportWithTarget[]> {
  const rows = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      note: reports.note,
      createdAt: reports.createdAt,
      reporterEmail: users.email,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterUserId, users.id))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt));

  return Promise.all(
    rows.map(async (row) => {
      const target = await resolveTarget(row.targetType as ReportTargetType, row.targetId);
      return {
        id: row.id,
        targetType: row.targetType as ReportTargetType,
        targetId: row.targetId,
        reason: row.reason,
        note: row.note,
        createdAt: row.createdAt,
        reporterEmail: row.reporterEmail,
        targetLabel: target.label,
        targetHref: target.href,
        targetOwners: target.owners,
      };
    }),
  );
}

export async function resolveReport(reportId: string): Promise<void> {
  await db.update(reports).set({ status: "resolved", resolvedAt: new Date() }).where(eq(reports.id, reportId));
}

/**
 * Deletes (or, for a Duell side, nulls out) the reported content itself —
 * separate from resolveReport, since an admin may resolve a report without
 * removing anything (e.g. it was unfounded). Cascades already defined on
 * soloPitches/reactions/comments/castingSubmissions/creatorSubmissions
 * (see schema.ts) clean up their own likes/comments/votes. `brand` has no
 * removal here — deleting a whole brand cascades into battles other
 * brands/voters are part of, too destructive to trigger from a report;
 * ban the brand's owner(s) instead.
 */
export async function removeReportedContent(targetType: ReportTargetType, targetId: string): Promise<void> {
  switch (targetType) {
    case "solo_pitch":
      await db.delete(soloPitches).where(eq(soloPitches.id, targetId));
      return;
    case "reaction":
      await db.delete(reactions).where(eq(reactions.id, targetId));
      return;
    case "comment":
      await db.delete(comments).where(eq(comments.id, targetId));
      return;
    case "casting_submission":
      await db.delete(castingSubmissions).where(eq(castingSubmissions.id, targetId));
      return;
    case "creator_submission":
      await db.delete(creatorSubmissions).where(eq(creatorSubmissions.id, targetId));
      return;
    case "battle_a":
      await db.update(battles).set({ brandAVideoUrl: null, brandASubmittedAt: null }).where(eq(battles.id, targetId));
      return;
    case "battle_b":
      await db.update(battles).set({ brandBVideoUrl: null, brandBSubmittedAt: null }).where(eq(battles.id, targetId));
      return;
    case "brand":
      return;
  }
}

export async function banUser(userId: string): Promise<void> {
  await db.update(users).set({ bannedAt: new Date() }).where(eq(users.id, userId));
}

export async function unbanUser(userId: string): Promise<void> {
  await db.update(users).set({ bannedAt: null }).where(eq(users.id, userId));
}

/** Everyone with an active ban — for the admin page's "gesperrte Nutzer" list. */
export async function getBannedUsers() {
  return db
    .select({ id: users.id, email: users.email, bannedAt: users.bannedAt })
    .from(users)
    .where(isNotNull(users.bannedAt))
    .orderBy(desc(users.bannedAt));
}
