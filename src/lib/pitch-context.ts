import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, castingSubmissions, creatorChallenges, partnerCastings } from "@/db/schema";
import { periodLabel } from "@/lib/creator-charts";

/**
 * RN-7 (Luca 30.09.): Solo-Pitches, die zu einer Creator-Challenge oder
 * einem Partner-Casting eingereicht wurden, laufen normal im Feed — mit
 * einem Knopf, der zur Challenge bzw. zum Casting führt. Das hier liefert
 * dafür Art, Ziel-ID und Beschriftung pro Post (eine Abfrage je Art für die
 * ganze Feed-Seite).
 */
export type PitchContext = { kind: "challenge" | "casting"; id: string; label: string };

export async function getSoloPitchContexts(
  pitches: { id: string; creatorChallengeId: string | null }[],
): Promise<Map<string, PitchContext>> {
  const result = new Map<string, PitchContext>();
  if (pitches.length === 0) return result;

  const challengeIds = [...new Set(pitches.map((p) => p.creatorChallengeId).filter((id): id is string => Boolean(id)))];
  const [challengeRows, castingRows] = await Promise.all([
    challengeIds.length
      ? db
          .select({ id: creatorChallenges.id, period: creatorChallenges.period, brandName: brands.name })
          .from(creatorChallenges)
          .innerJoin(brands, eq(creatorChallenges.brandId, brands.id))
          .where(inArray(creatorChallenges.id, challengeIds))
      : Promise.resolve([]),
    db
      .select({ soloPitchId: castingSubmissions.soloPitchId, castingId: castingSubmissions.castingId, hostName: brands.name })
      .from(castingSubmissions)
      .innerJoin(partnerCastings, eq(castingSubmissions.castingId, partnerCastings.id))
      .innerJoin(brands, eq(partnerCastings.hostBrandId, brands.id))
      .where(inArray(castingSubmissions.soloPitchId, pitches.map((p) => p.id))),
  ]);

  const challengeById = new Map(challengeRows.map((c) => [c.id, c]));
  for (const p of pitches) {
    const c = p.creatorChallengeId ? challengeById.get(p.creatorChallengeId) : undefined;
    if (c) {
      result.set(p.id, {
        kind: "challenge",
        id: c.id,
        label: `Creator-Challenge ${c.brandName} · ${periodLabel(c.period).split(" ")[0]}`,
      });
    }
  }
  for (const row of castingRows) {
    if (row.soloPitchId) result.set(row.soloPitchId, { kind: "casting", id: row.castingId, label: `Partner-Casting ${row.hostName}` });
  }
  return result;
}
