import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { brands, comments, duelPollOptions, duelPolls, duelPollVotes } from "@/db/schema";
import { getBrandMemberUserIds } from "@/lib/brand";
import { notifyUsers } from "@/lib/notification";
import { guestDeviceHash } from "@/lib/vote";

// Luca 17.11. (Phasen-Map 5.5): Duell-Umfragen von MarkItch. Der Admin stellt
// „Marke A gegen B, C oder D“ ein, Zuschauer wählen die Paarung, die sie am
// ehesten sehen wollen. Eine Stimme pro Konto bzw. Gerät; Gäste zählen hier
// voll (es wird nichts entschieden, nur Interesse gemessen). Prozente sieht
// man erst nach der eigenen Stimme — vorher würde der Zwischenstand lenken.

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 4;
export const POLL_TITLE_MAX = 80;
/** Luca 17.11.: Frist in Tagen (Standard eine Woche). */
export const POLL_DAYS_DEFAULT = 7;
export const POLL_DAYS_MAX = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Läuft die Umfrage noch (nicht beendet und Frist nicht vorbei)? */
export function isPollOpen(p: { status: string; endsAt: Date | null }, now = new Date()): boolean {
  return p.status === "open" && (p.endsAt === null || p.endsAt > now);
}

/** Frist aus Tagen: ganze Zahl 1–30, sonst Standard. Rein, ohne DB. */
export function pollEndsAt(rawDays: unknown, now = new Date()): Date {
  const days = typeof rawDays === "number" && Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= POLL_DAYS_MAX ? rawDays : POLL_DAYS_DEFAULT;
  return new Date(now.getTime() + days * DAY_MS);
}

type PollBrand = { id: string; name: string; slug: string; logoUrl: string | null };

export type PublicDuelPoll = {
  id: string;
  title: string | null;
  /** Gesamtzahl der Stimmen; die Aufteilung (`votes`) nur nach eigener Stimme. */
  total: number;
  viewerOptionId: string | null;
  endsAt: Date | null;
  commentCount: number;
  options: { id: string; brandA: PollBrand; brandB: PollBrand; votes: number | null }[];
};

export type AdminDuelPoll = {
  id: string;
  title: string | null;
  /** „closed“ auch, wenn die Frist vorbei ist. */
  status: "open" | "closed";
  createdAt: Date;
  closedAt: Date | null;
  endsAt: Date | null;
  total: number;
  commentCount: number;
  options: { id: string; brandA: PollBrand; brandB: PollBrand; votes: number; guestVotes: number; savedForLater: boolean; sentToBrandsAt: Date | null }[];
};

async function loadOptions(pollIds: string[]) {
  if (pollIds.length === 0) return [];
  const options = await db.select().from(duelPollOptions).where(inArray(duelPollOptions.pollId, pollIds)).orderBy(asc(duelPollOptions.position));
  const brandIds = [...new Set(options.flatMap((o) => [o.brandAId, o.brandBId]))];
  const brandRows = brandIds.length
    ? await db.select({ id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl }).from(brands).where(inArray(brands.id, brandIds))
    : [];
  const byId = new Map(brandRows.map((b) => [b.id, b]));
  const counts = await db
    .select({ optionId: duelPollVotes.optionId, guest: isNotNull(duelPollVotes.deviceHash), n: count() })
    .from(duelPollVotes)
    .where(inArray(duelPollVotes.pollId, pollIds))
    .groupBy(duelPollVotes.optionId, isNotNull(duelPollVotes.deviceHash));
  const tally = new Map<string, { all: number; guests: number }>();
  for (const c of counts) {
    const t = tally.get(c.optionId) ?? { all: 0, guests: 0 };
    t.all += Number(c.n);
    if (c.guest) t.guests += Number(c.n);
    tally.set(c.optionId, t);
  }
  return options.flatMap((o) => {
    const a = byId.get(o.brandAId);
    const b = byId.get(o.brandBId);
    if (!a || !b) return [];
    const t = tally.get(o.id) ?? { all: 0, guests: 0 };
    return [{ ...o, brandA: a, brandB: b, votes: t.all, guestVotes: t.guests }];
  });
}

async function commentCounts(pollIds: string[]): Promise<Map<string, number>> {
  if (pollIds.length === 0) return new Map();
  const rows = await db.select({ pollId: comments.pollId, n: count() }).from(comments).where(inArray(comments.pollId, pollIds)).groupBy(comments.pollId);
  return new Map(rows.map((r) => [r.pollId as string, Number(r.n)]));
}

/** Laufende Umfragen für Duelle-Tab, Feed (App) und /pitches (Web), neueste zuerst. */
export async function getOpenDuelPolls(viewerId: string | null, guestId: unknown): Promise<PublicDuelPoll[]> {
  const polls = await db
    .select()
    .from(duelPolls)
    .where(and(eq(duelPolls.status, "open"), or(isNull(duelPolls.endsAt), gt(duelPolls.endsAt, new Date()))))
    .orderBy(desc(duelPolls.createdAt))
    .limit(20);
  if (polls.length === 0) return [];
  const ids = polls.map((p) => p.id);
  const [options, nComments] = await Promise.all([loadOptions(ids), commentCounts(ids)]);
  const deviceHash = viewerId ? null : guestDeviceHash(guestId);
  const own =
    viewerId || deviceHash
      ? await db
          .select({ pollId: duelPollVotes.pollId, optionId: duelPollVotes.optionId })
          .from(duelPollVotes)
          .where(and(inArray(duelPollVotes.pollId, ids), viewerId ? eq(duelPollVotes.userId, viewerId) : eq(duelPollVotes.deviceHash, deviceHash!)))
      : [];
  const ownByPoll = new Map(own.map((v) => [v.pollId, v.optionId]));

  return polls.flatMap((p) => {
    const opts = options.filter((o) => o.pollId === p.id);
    if (opts.length < POLL_MIN_OPTIONS) return [];
    const viewerOptionId = ownByPoll.get(p.id) ?? null;
    return [
      {
        id: p.id,
        title: p.title,
        total: opts.reduce((s, o) => s + o.votes, 0),
        viewerOptionId,
        endsAt: p.endsAt,
        commentCount: nComments.get(p.id) ?? 0,
        options: opts.map((o) => ({ id: o.id, brandA: o.brandA, brandB: o.brandB, votes: viewerOptionId ? o.votes : null })),
      },
    ];
  });
}

/** Eine Stimme pro Konto bzw. Gerät und Umfrage. */
export async function castDuelPollVote(pollId: string, optionId: string, viewerId: string | null, guestId: unknown): Promise<{ error?: string }> {
  const deviceHash = viewerId ? null : guestDeviceHash(guestId);
  if (!viewerId && !deviceHash) return { error: "Bitte melde dich an." };
  const [option] = await db
    .select({ id: duelPollOptions.id, status: duelPolls.status, endsAt: duelPolls.endsAt })
    .from(duelPollOptions)
    .innerJoin(duelPolls, eq(duelPolls.id, duelPollOptions.pollId))
    .where(and(eq(duelPollOptions.id, optionId), eq(duelPollOptions.pollId, pollId)))
    .limit(1);
  if (!option) return { error: "Diese Umfrage gibt es nicht mehr." };
  if (!isPollOpen(option)) return { error: "Die Abstimmung ist beendet." };
  const inserted = await db
    .insert(duelPollVotes)
    .values({ pollId, optionId, userId: viewerId, deviceHash })
    .onConflictDoNothing()
    .returning({ id: duelPollVotes.id });
  if (inserted.length === 0) return { error: "Du hast bereits abgestimmt." };
  return {};
}

// ——— Admin ———

export async function listDuelPollsForAdmin(): Promise<AdminDuelPoll[]> {
  const polls = await db.select().from(duelPolls).orderBy(desc(duelPolls.createdAt)).limit(50);
  const ids = polls.map((p) => p.id);
  const [options, nComments] = await Promise.all([loadOptions(ids), commentCounts(ids)]);
  return polls.map((p) => {
    const opts = options.filter((o) => o.pollId === p.id);
    return {
      id: p.id,
      title: p.title,
      status: isPollOpen(p) ? "open" : "closed",
      createdAt: p.createdAt,
      closedAt: p.closedAt,
      endsAt: p.endsAt,
      total: opts.reduce((s, o) => s + o.votes, 0),
      commentCount: nComments.get(p.id) ?? 0,
      options: opts.map((o) => ({
        id: o.id,
        brandA: o.brandA,
        brandB: o.brandB,
        votes: o.votes,
        guestVotes: o.guestVotes,
        savedForLater: o.savedForLater,
        sentToBrandsAt: o.sentToBrandsAt,
      })),
    };
  });
}

/** Prüft Titel und Paarungen (2–4, je zwei verschiedene Marken, keine doppelt). Rein, ohne DB. */
export function parseDuelPollInput(rawTitle: unknown, rawPairs: unknown): { error: string } | { title: string | null; pairs: [string, string][] } {
  const title = typeof rawTitle === "string" ? rawTitle.trim().slice(0, POLL_TITLE_MAX) || null : null;
  if (!Array.isArray(rawPairs) || rawPairs.length < POLL_MIN_OPTIONS || rawPairs.length > POLL_MAX_OPTIONS) {
    return { error: "Bitte 2 bis 4 Paarungen wählen." };
  }
  const seen = new Set<string>();
  const pairs: [string, string][] = [];
  for (const p of rawPairs) {
    if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== "string" || typeof p[1] !== "string") return { error: "Ungültige Anfrage." };
    const [a, b] = p as [string, string];
    if (a === b) return { error: "Eine Marke kann nicht gegen sich selbst antreten." };
    const key = [a, b].sort().join("|");
    if (seen.has(key)) return { error: "Eine Paarung ist doppelt." };
    seen.add(key);
    pairs.push([a, b]);
  }
  return { title, pairs };
}

export async function createDuelPoll(title: string | null, pairs: [string, string][], endsAt: Date): Promise<{ error?: string; id?: string }> {
  const ids = [...new Set(pairs.flat())];
  const found = await db.select({ id: brands.id }).from(brands).where(inArray(brands.id, ids));
  if (found.length !== ids.length) return { error: "Eine der Marken gibt es nicht mehr." };
  return db.transaction(async (tx) => {
    const [poll] = await tx.insert(duelPolls).values({ title, endsAt }).returning({ id: duelPolls.id });
    await tx.insert(duelPollOptions).values(pairs.map(([brandAId, brandBId], position) => ({ pollId: poll.id, brandAId, brandBId, position })));
    return { id: poll.id };
  });
}

export async function setDuelPollStatus(pollId: string, status: "open" | "closed"): Promise<void> {
  const now = new Date();
  if (status === "closed") {
    await db.update(duelPolls).set({ status, closedAt: now }).where(eq(duelPolls.id, pollId));
    return;
  }
  // Wieder öffnen: ist die Frist schon vorbei, läuft sie noch einmal eine Woche.
  const [poll] = await db.select({ endsAt: duelPolls.endsAt }).from(duelPolls).where(eq(duelPolls.id, pollId)).limit(1);
  const endsAt = poll?.endsAt && poll.endsAt <= now ? pollEndsAt(POLL_DAYS_DEFAULT, now) : (poll?.endsAt ?? null);
  await db.update(duelPolls).set({ status, closedAt: null, endsAt }).where(eq(duelPolls.id, pollId));
}

export async function deleteDuelPoll(pollId: string): Promise<void> {
  await db.delete(duelPolls).where(eq(duelPolls.id, pollId));
}

export async function setPollOptionSaved(optionId: string, saved: boolean): Promise<void> {
  await db.update(duelPollOptions).set({ savedForLater: saved }).where(eq(duelPollOptions.id, optionId));
}

/**
 * Luca 17.11.: „An Marken schicken“ — beide Marken der Paarung bekommen eine
 * Benachrichtigung mit der Zahl der Stimmen und landen auf dem Profil der
 * anderen Marke (dort ist „Duell einladen“). Ohne Art → kommt immer an.
 */
export async function sendPollOptionToBrands(optionId: string): Promise<{ error?: string }> {
  const [option] = await db.select().from(duelPollOptions).where(eq(duelPollOptions.id, optionId)).limit(1);
  if (!option) return { error: "Diese Umfrage gibt es nicht mehr." };
  const [loaded] = (await loadOptions([option.pollId])).filter((o) => o.id === optionId);
  if (!loaded) return { error: "Eine der Marken gibt es nicht mehr." };
  const { brandA, brandB, votes } = loaded;
  const people = (n: number) => ({ de: n === 1 ? "1 Zuschauer will" : `${n} Zuschauer wollen`, en: n === 1 ? "1 viewer wants" : `${n} viewers want` });
  const p = people(votes);
  const send = async (own: PollBrand, other: PollBrand) =>
    notifyUsers(
      await getBrandMemberUserIds(own.id),
      {
        de: `MarkItch-Umfrage: ${p.de} ein Duell ${own.name} gegen ${other.name} sehen. Lade ${other.name} jetzt zum Duell ein!`,
        en: `MarkItch poll: ${p.en} to see a duel ${own.name} vs ${other.name}. Invite ${other.name} to a duel now!`,
      },
      `/brands/${other.slug}`,
    );
  await Promise.all([send(brandA, brandB), send(brandB, brandA)]);
  await db.update(duelPollOptions).set({ sentToBrandsAt: new Date() }).where(eq(duelPollOptions.id, optionId));
  return {};
}
