import "server-only";
import { and, count, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { brandAnalyticsEvents, brands, comments, follows, guestVotes, likes, reactions, seenContent, votes } from "@/db/schema";

// Luca 13.11. (Phase 6): Feed-Ranking statt rein chronologisch.
//
//  Punkte   = (Interaktionen + 1) / (Alter in Stunden + 2)^1,5 × Qualität × Persönlich
//  Interaktionen: Like 1, Meinung 2, Stimme 1,5, Reaktion 3, Teilen 4, Link-Klick 3
//  Qualität: Anteil „bis zum Ende angesehen“ (0,6 … 1,6), erst ab ein paar Aufrufen aussagekräftig
//  Persönlich: gefolgte Marke ×1,6, Lieblings-Kategorie ×1,3, schon gesehen ×0,15 (rutscht nach hinten, nicht weg)
//  Neue Videos (< 48 h, < 30 Aufrufe) stehen spätestens auf einem Test-Platz (2, 7, 12 …) — weiter vorn,
//  wenn ihre Punkte das hergeben; danach zählen nur noch ihre Zahlen.
//  Dieselbe Marke/Person nie zweimal hintereinander.
//  Boost (nur wenn BOOST_ENABLED): Punkte ×2 und ein fester Platz weit oben, solange der Boost läuft.
// Die Uhr wird auf 10 Minuten gerundet, damit die Reihenfolge beim Nachladen stabil bleibt.

export type RankItem = {
  key: string;
  type: "pitch" | "battle" | "reaction";
  id: string;
  /** Marken, die im Beitrag vorkommen (Duell: beide). */
  brandIds: string[];
  /** Wer „spricht“ — für „nie zweimal hintereinander“ (Marke bzw. Person bei Reaktionen). */
  speakerKeys: string[];
  createdAt: Date;
  boosted?: boolean;
};

const W = { like: 1, comment: 2, vote: 1.5, reaction: 3, share: 4, cta: 3 };
const FOLLOW_BOOST = 1.6;
const CATEGORY_BOOST = 1.3;
const SEEN_FACTOR = 0.15;
const NEW_MAX_AGE_H = 48;
const NEW_MAX_VIEWS = 30;
const EXPLORE_EVERY = 5; // Test-Platz an Position 2, 7, 12, …
const EXPLORE_FIRST = 2;
const BOOST_SLOT = 3;
const BUCKET_MS = 10 * 60 * 1000;
/** Wie stark das Alter zählt (höher = Frisches gewinnt schneller). */
const GRAVITY = 1.5;

export type Counts = { likes: number; comments: number; votes: number; reactions: number; shares: number; cta: number; views: number; completes: number };
export const empty = (): Counts => ({ likes: 0, comments: 0, votes: 0, reactions: 0, shares: 0, cta: 0, views: 0, completes: 0 });

/** Kleiner, stabiler Zufall je Betrachter und Beitrag (für die Reihenfolge der Test-Plätze). */
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

async function loadSignals(items: RankItem[]): Promise<Map<string, Counts>> {
  const ids = (type: RankItem["type"]) => items.filter((i) => i.type === type).map((i) => i.id);
  const pitchIds = ids("pitch");
  const battleIds = ids("battle");
  const reactionIds = ids("reaction");
  const counts = new Map<string, Counts>(items.map((i) => [`${i.type}:${i.id}`, empty()]));
  const add = (type: RankItem["type"], id: string | null, field: keyof Counts, n: number) => {
    if (!id) return;
    const c = counts.get(`${type}:${id}`);
    if (c) c[field] += Number(n);
  };
  const anyOf = (conds: (SQL | null)[]) => {
    const list = conds.filter((c): c is SQL => c !== null);
    return list.length ? or(...list) : null;
  };
  const inIds = (col: AnyPgColumn, list: string[]): SQL | null => (list.length ? inArray(col, list) : null);

  // Nacheinander statt alle parallel — schont die Datenbank-Verbindungen (siehe platform-analytics.ts).
  const eventWhere = anyOf([inIds(brandAnalyticsEvents.soloPitchId, pitchIds), inIds(brandAnalyticsEvents.battleId, battleIds)]);
  if (eventWhere) {
    const rows = await db
      .select({ p: brandAnalyticsEvents.soloPitchId, b: brandAnalyticsEvents.battleId, kind: brandAnalyticsEvents.kind, n: count() })
      .from(brandAnalyticsEvents)
      .where(and(eventWhere, inArray(brandAnalyticsEvents.kind, ["view", "complete", "share", "cta_click"])))
      .groupBy(brandAnalyticsEvents.soloPitchId, brandAnalyticsEvents.battleId, brandAnalyticsEvents.kind);
    const field: Record<string, keyof Counts> = { view: "views", complete: "completes", share: "shares", cta_click: "cta" };
    for (const r of rows) {
      if (r.p) add("pitch", r.p, field[r.kind], r.n);
      else add("battle", r.b, field[r.kind], r.n);
    }
  }

  const likeWhere = anyOf([inIds(likes.soloPitchId, pitchIds), inIds(likes.battleId, battleIds), inIds(likes.reactionId, reactionIds)]);
  if (likeWhere) {
    const rows = await db
      .select({ p: likes.soloPitchId, b: likes.battleId, r: likes.reactionId, n: count() })
      .from(likes)
      .where(likeWhere)
      .groupBy(likes.soloPitchId, likes.battleId, likes.reactionId);
    for (const r of rows) {
      if (r.r) add("reaction", r.r, "likes", r.n);
      else if (r.p) add("pitch", r.p, "likes", r.n);
      else add("battle", r.b, "likes", r.n);
    }
  }

  const commentWhere = anyOf([inIds(comments.soloPitchId, pitchIds), inIds(comments.battleId, battleIds), inIds(comments.reactionId, reactionIds)]);
  if (commentWhere) {
    const rows = await db
      .select({ p: comments.soloPitchId, b: comments.battleId, r: comments.reactionId, n: count() })
      .from(comments)
      .where(commentWhere)
      .groupBy(comments.soloPitchId, comments.battleId, comments.reactionId);
    for (const r of rows) {
      if (r.r) add("reaction", r.r, "comments", r.n);
      else if (r.p) add("pitch", r.p, "comments", r.n);
      else add("battle", r.b, "comments", r.n);
    }
  }

  if (battleIds.length) {
    const reg = await db.select({ b: votes.battleId, n: count() }).from(votes).where(inArray(votes.battleId, battleIds)).groupBy(votes.battleId);
    for (const r of reg) add("battle", r.b, "votes", r.n);
    const guests = await db
      .select({ b: guestVotes.battleId, n: count() })
      .from(guestVotes)
      .where(inArray(guestVotes.battleId, battleIds))
      .groupBy(guestVotes.battleId);
    // Gast-Stimmen zählen halb — wie im Ergebnis.
    for (const r of guests) add("battle", r.b, "votes", Number(r.n) / 2);
  }

  if (pitchIds.length) {
    const rows = await db
      .select({ p: reactions.soloPitchId, n: count() })
      .from(reactions)
      .where(inArray(reactions.soloPitchId, pitchIds))
      .groupBy(reactions.soloPitchId);
    for (const r of rows) add("pitch", r.p, "reactions", r.n);
  }
  return counts;
}

export type Viewer = { followed: Set<string>; categories: Set<string>; seen: Set<string> };

async function loadViewer(viewerId: string | null, items: RankItem[]): Promise<Viewer> {
  if (!viewerId) return { followed: new Set(), categories: new Set(), seen: new Set() };
  const followedRows = await db.select({ brandId: follows.brandId }).from(follows).where(eq(follows.userId, viewerId));
  const since = sql`now() - interval '90 days'`;
  // Lieblings-Kategorien: Kategorien der Marken, die man gelikt, gewählt oder abonniert hat (top 3).
  const { rows: catRows } = await db.execute<{ category: string; n: string | number }>(sql`
    select b.category, count(*) as n from (
      select ${likes.brandId} as brand_id from ${likes} where ${likes.userId} = ${viewerId} and ${likes.brandId} is not null and ${likes.createdAt} > ${since}
      union all
      select ${votes.votedForBrandId} from ${votes} where ${votes.userId} = ${viewerId} and ${votes.createdAt} > ${since}
      union all
      select ${follows.brandId} from ${follows} where ${follows.userId} = ${viewerId}
    ) x join ${brands} b on b.id = x.brand_id
    group by b.category order by n desc limit 3
  `);
  const targetIds = items.filter((i) => i.type !== "reaction").map((i) => i.id);
  const seenRows = targetIds.length
    ? await db
        .select({ t: seenContent.targetType, id: seenContent.targetId })
        .from(seenContent)
        .where(and(eq(seenContent.userId, viewerId), inArray(seenContent.targetId, targetIds)))
    : [];
  return {
    followed: new Set(followedRows.map((r) => r.brandId)),
    categories: new Set(catRows.map((r) => r.category)),
    seen: new Set(seenRows.map((r) => `${r.t}:${r.id}`)),
  };
}

async function loadCategories(items: RankItem[]): Promise<Map<string, string>> {
  const brandIds = [...new Set(items.flatMap((i) => i.brandIds))];
  if (!brandIds.length) return new Map();
  const rows = await db.select({ id: brands.id, category: brands.category }).from(brands).where(inArray(brands.id, brandIds));
  return new Map(rows.map((r) => [r.id, r.category]));
}

/** Gibt die Beiträge in Feed-Reihenfolge zurück. */
export async function rankFeed<T extends RankItem>(viewerId: string | null, items: T[]): Promise<T[]> {
  if (items.length <= 1) return items;
  const signals = await loadSignals(items);
  const viewer = await loadViewer(viewerId, items);
  const categories = await loadCategories(items);
  return orderItems(items, { signals, viewer, categories, viewerId, now: Date.now() });
}

export type RankInput = {
  signals: Map<string, Counts>;
  viewer: Viewer;
  categories: Map<string, string>;
  viewerId: string | null;
  now: number;
};

/** Reine Sortierung (ohne Datenbank) — einzeln testbar. */
export function orderItems<T extends RankItem>(items: T[], input: RankInput): T[] {
  const { signals, viewer, categories, viewerId } = input;
  const now = Math.floor(input.now / BUCKET_MS) * BUCKET_MS;
  const scored = items.map((item) => {
    const c = signals.get(`${item.type}:${item.id}`) ?? empty();
    const ageH = Math.max(0, (now - item.createdAt.getTime()) / 3_600_000);
    const engagement = c.likes * W.like + c.comments * W.comment + c.votes * W.vote + c.reactions * W.reaction + c.shares * W.share + c.cta * W.cta;
    // Qualität erst ab 5 Aufrufen — davor neutral.
    const quality = c.views >= 5 ? 0.6 + Math.min(1, c.completes / c.views) : 1;
    let score = ((engagement + 1) / Math.pow(ageH + 2, GRAVITY)) * quality;
    if (item.brandIds.some((b) => viewer.followed.has(b))) score *= FOLLOW_BOOST;
    if (item.brandIds.some((b) => viewer.categories.has(categories.get(b) ?? ""))) score *= CATEGORY_BOOST;
    const seen = viewer.seen.has(`${item.type}:${item.id}`);
    if (seen) score *= SEEN_FACTOR;
    if (item.boosted) score *= 2;
    const isNew = !seen && item.type !== "reaction" && ageH < NEW_MAX_AGE_H && c.views < NEW_MAX_VIEWS;
    return { item, score, isNew };
  });

  const order: T[] = scored
    .sort((a, b) => b.score - a.score || b.item.createdAt.getTime() - a.item.createdAt.getTime())
    .map((s) => s.item);
  // Höchstens auf Platz `pos` — steht der Beitrag weiter hinten, wird er dorthin vorgezogen.
  const atMost = (item: T, pos: number) => {
    const idx = order.indexOf(item);
    const target = Math.min(pos, order.length - 1);
    if (idx <= target) return;
    order.splice(idx, 1);
    order.splice(target, 0, item);
  };

  // Boost: ein fester Platz weit oben (spätestens Platz 4).
  const boosted = scored.filter((s) => s.item.boosted && !s.isNew).sort((a, b) => b.score - a.score);
  if (boosted[0]) atMost(boosted[0].item, BOOST_SLOT);

  // Neue Videos: kleine Testgruppe — spätestens auf einem Test-Platz, je Betrachter gemischt.
  const seed = viewerId ?? "anon";
  const explore = scored.filter((s) => s.isNew).sort((a, b) => seeded(seed + a.item.key) - seeded(seed + b.item.key));
  explore.forEach((s, i) => atMost(s.item, EXPLORE_FIRST + i * EXPLORE_EVERY));

  // Nie zweimal hintereinander dieselbe Marke/Person: den nächsten passenden Beitrag vorziehen.
  for (let i = 1; i < order.length; i++) {
    const prev = new Set(order[i - 1].speakerKeys);
    if (!order[i].speakerKeys.some((k) => prev.has(k))) continue;
    const j = order.findIndex((it, idx) => idx > i && idx <= i + 8 && !it.speakerKeys.some((k) => prev.has(k)));
    if (j > i) {
      const [moved] = order.splice(j, 1);
      order.splice(i, 0, moved);
    }
  }
  return order;
}
