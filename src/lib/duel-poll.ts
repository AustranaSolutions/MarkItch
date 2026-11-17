import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { brands, duelPollOptions, duelPolls, duelPollVotes } from "@/db/schema";
import { guestDeviceHash } from "@/lib/vote";

// Luca 17.11. (Phasen-Map 5.5): Duell-Umfragen von MarkItch. Der Admin stellt
// „Marke A gegen B, C oder D“ ein, Zuschauer wählen die Paarung, die sie am
// ehesten sehen wollen. Eine Stimme pro Konto bzw. Gerät; Gäste zählen hier
// voll (es wird nichts entschieden, nur Interesse gemessen). Prozente sieht
// man erst nach der eigenen Stimme — vorher würde der Zwischenstand lenken.

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 4;
export const POLL_TITLE_MAX = 80;

type PollBrand = { id: string; name: string; slug: string; logoUrl: string | null };

export type PublicDuelPoll = {
  id: string;
  title: string | null;
  /** Gesamtzahl der Stimmen; die Aufteilung (`votes`) nur nach eigener Stimme. */
  total: number;
  viewerOptionId: string | null;
  options: { id: string; brandA: PollBrand; brandB: PollBrand; votes: number | null }[];
};

export type AdminDuelPoll = {
  id: string;
  title: string | null;
  status: "open" | "closed";
  createdAt: Date;
  closedAt: Date | null;
  total: number;
  options: { id: string; brandA: PollBrand; brandB: PollBrand; votes: number; guestVotes: number; savedForLater: boolean }[];
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

/** Offene Umfragen für Duelle-Tab (App) und /pitches (Web), neueste zuerst. */
export async function getOpenDuelPolls(viewerId: string | null, guestId: unknown): Promise<PublicDuelPoll[]> {
  const polls = await db.select().from(duelPolls).where(eq(duelPolls.status, "open")).orderBy(desc(duelPolls.createdAt)).limit(5);
  if (polls.length === 0) return [];
  const ids = polls.map((p) => p.id);
  const options = await loadOptions(ids);
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
    .select({ id: duelPollOptions.id, status: duelPolls.status })
    .from(duelPollOptions)
    .innerJoin(duelPolls, eq(duelPolls.id, duelPollOptions.pollId))
    .where(and(eq(duelPollOptions.id, optionId), eq(duelPollOptions.pollId, pollId)))
    .limit(1);
  if (!option) return { error: "Diese Umfrage gibt es nicht mehr." };
  if (option.status !== "open") return { error: "Die Abstimmung ist beendet." };
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
  const options = await loadOptions(polls.map((p) => p.id));
  return polls.map((p) => {
    const opts = options.filter((o) => o.pollId === p.id);
    return {
      id: p.id,
      title: p.title,
      status: p.status === "closed" ? "closed" : "open",
      createdAt: p.createdAt,
      closedAt: p.closedAt,
      total: opts.reduce((s, o) => s + o.votes, 0),
      options: opts.map((o) => ({ id: o.id, brandA: o.brandA, brandB: o.brandB, votes: o.votes, guestVotes: o.guestVotes, savedForLater: o.savedForLater })),
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

export async function createDuelPoll(title: string | null, pairs: [string, string][]): Promise<{ error?: string; id?: string }> {
  const ids = [...new Set(pairs.flat())];
  const found = await db.select({ id: brands.id }).from(brands).where(inArray(brands.id, ids));
  if (found.length !== ids.length) return { error: "Eine der Marken gibt es nicht mehr." };
  return db.transaction(async (tx) => {
    const [poll] = await tx.insert(duelPolls).values({ title }).returning({ id: duelPolls.id });
    await tx.insert(duelPollOptions).values(pairs.map(([brandAId, brandBId], position) => ({ pollId: poll.id, brandAId, brandBId, position })));
    return { id: poll.id };
  });
}

export async function setDuelPollStatus(pollId: string, status: "open" | "closed"): Promise<void> {
  await db
    .update(duelPolls)
    .set({ status, closedAt: status === "closed" ? new Date() : null })
    .where(eq(duelPolls.id, pollId));
}

export async function deleteDuelPoll(pollId: string): Promise<void> {
  await db.delete(duelPolls).where(eq(duelPolls.id, pollId));
}

export async function setPollOptionSaved(optionId: string, saved: boolean): Promise<void> {
  await db.update(duelPollOptions).set({ savedForLater: saved }).where(eq(duelPollOptions.id, optionId));
}
