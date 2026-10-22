import "server-only";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { battles, brands, notifications, votes } from "@/db/schema";
import { getVoteTallyAsOf } from "@/lib/vote";
import { sendPushToUser } from "@/lib/push";
import { getBrandMemberUserIds } from "@/lib/brand";
import { getReminderUserIds } from "@/lib/reminder";

/**
 * Phase 12: "your Pitch's result is in" push. There's no cron job in this
 * app — see battle-stage.ts's own philosophy of computing everything at
 * read time — so this piggybacks on the busiest read path there is, the
 * feed (buildFeedDuels in src/lib/feed.ts calls this via next/server's
 * after() for every battle that just turned out to be finished-and-voted
 * with resultNotifiedAt still null). On a platform whose whole pitch is
 * "people check back every few minutes", that's a tighter notification
 * delay in practice than a once-a-day Vercel Hobby-plan cron could give
 * anyway, and it costs nothing when nobody's browsing.
 *
 * The UPDATE ... WHERE result_notified_at IS NULL is the concurrency guard:
 * if several requests race to finalize the same battle at once (normal —
 * this isn't behind a lock), only the one that actually flips the column
 * from NULL proceeds to send anything. Everyone else's claim affects 0 rows
 * and returns immediately.
 */
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

type Note = { userId: string; message: string };

async function deliver(notes: Note[], title: string, url: string): Promise<void> {
  if (notes.length === 0) return;
  await db.insert(notifications).values(notes.map((n) => ({ userId: n.userId, message: n.message, link: url })));
  await Promise.all(notes.map((n) => sendPushToUser(n.userId, { title, body: n.message, url }).catch(() => {})));
}

export async function finalizeAndNotifyBattle(battleId: string): Promise<void> {
  const claimed = await db
    .update(battles)
    .set({ resultNotifiedAt: new Date() })
    .where(and(eq(battles.id, battleId), isNull(battles.resultNotifiedAt)))
    .returning({
      id: battles.id,
      brandAId: battles.brandAId,
      brandBId: battles.brandBId,
      votingEndsAt: battles.votingEndsAt,
      productionDeadline: battles.productionDeadline,
      brandAVideoUrl: battles.brandAVideoUrl,
      brandBVideoUrl: battles.brandBVideoUrl,
    });
  if (claimed.length === 0) return; // already notified, or lost the race — nothing to do

  const battle = claimed[0];
  // Luca 22.10.: alte, längst beendete Duelle (vor dieser Funktion) nur als
  // erledigt markieren — keine Benachrichtigungs-Flut für Vergangenes.
  const endedAt = battle.votingEndsAt ?? battle.productionDeadline;
  if (!endedAt || Date.now() - endedAt.getTime() > RECENT_MS) return;

  const [brandARows, brandBRows, membersA, membersB] = await Promise.all([
    db.select({ name: brands.name }).from(brands).where(eq(brands.id, battle.brandAId)).limit(1),
    db.select({ name: brands.name }).from(brands).where(eq(brands.id, battle.brandBId)).limit(1),
    getBrandMemberUserIds(battle.brandAId),
    getBrandMemberUserIds(battle.brandBId),
  ]);
  const brandAName = brandARows[0]?.name ?? "Marke A";
  const brandBName = brandBRows[0]?.name ?? "Marke B";
  const url = `/?battle=${battle.id}`;

  // Luca 22.10.: Duell fand nicht statt (Frist abgelaufen, mindestens ein Video fehlt) →
  // beide Seiten und alle, die es sich vorgemerkt hatten, bekommen trotzdem Bescheid.
  if (!battle.votingEndsAt) {
    const reminderUserIds = await getReminderUserIds(battle.id);
    const notes: Note[] = [];
    const side = (members: string[], other: string, ownHasVideo: boolean, otherHasVideo: boolean) => {
      const message = ownHasVideo
        ? `Dein Duell gegen ${other} ist beendet: ${other} hat kein Video rechtzeitig hochgeladen. Es fand keine Abstimmung statt — dein Video bleibt in deinem Profil.`
        : otherHasVideo
          ? `Dein Duell gegen ${other} ist beendet, weil du kein Video rechtzeitig hochgeladen hast. Beim nächsten Mal an die Frist denken!`
          : `Dein Duell gegen ${other} ist beendet: Keine Seite hat rechtzeitig ein Video hochgeladen.`;
      for (const userId of members) notes.push({ userId, message });
    };
    const hasA = Boolean(battle.brandAVideoUrl);
    const hasB = Boolean(battle.brandBVideoUrl);
    side(membersA, brandBName, hasA, hasB);
    side(membersB, brandAName, hasB, hasA);
    const participants = new Set([...membersA, ...membersB]);
    for (const userId of reminderUserIds) {
      if (participants.has(userId)) continue;
      notes.push({ userId, message: `Das vorgemerkte Duell ${brandAName} vs. ${brandBName} findet nicht statt — es wurden nicht beide Videos rechtzeitig hochgeladen.` });
    }
    await deliver(notes, `Duell ${brandAName} vs. ${brandBName} beendet`, url);
    return;
  }

  const [official, voters] = await Promise.all([
    getVoteTallyAsOf(battle.id, battle.brandAId, battle.brandBId, battle.votingEndsAt),
    db
      .selectDistinct({ userId: votes.userId, votedForBrandId: votes.votedForBrandId })
      .from(votes)
      .where(eq(votes.battleId, battle.id)),
  ]);

  const title =
    official.brandAVotes === official.brandBVotes
      ? `🤝 Unentschieden: ${brandAName} vs. ${brandBName}`
      : official.brandAVotes > official.brandBVotes
        ? `🏆 ${brandAName} gewinnt gegen ${brandBName}!`
        : `🏆 ${brandBName} gewinnt gegen ${brandAName}!`;

  // Luca 11.10.: persönlich, aber ohne „richtig/falsch“ — wer gewinnt, ist
  // keine Wette. Nur: wofür du gestimmt hast und wie viele es so sahen wie du.
  // So lohnt sich ehrliches Abstimmen, nicht das Raten der Mehrheit.
  const total = official.brandAVotes + official.brandBVotes;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const messageFor = (votedForBrandId: string) => {
    const pickedA = votedForBrandId === battle.brandAId;
    const picked = pickedA ? brandAName : brandBName;
    const same = pickedA ? official.brandAVotes : official.brandBVotes;
    return `Ergebnis ${brandAName} vs. ${brandBName}: Du hast ${picked} gewählt — ${pct(same)} % sahen es wie du.`;
  };

  // Luca 22.10.: auch die beiden Teilnehmer erfahren ihr Ergebnis.
  const resultFor = (ownVotes: number, otherVotes: number, other: string) =>
    total === 0
      ? `Dein Duell gegen ${other} ist beendet — leider hat niemand abgestimmt.`
      : ownVotes === otherVotes
        ? `Dein Duell gegen ${other} ist beendet: Unentschieden (${total} Stimmen).`
        : ownVotes > otherVotes
          ? `🏆 Du hast dein Duell gegen ${other} gewonnen — mit ${pct(ownVotes)} % von ${total} Stimmen!`
          : `Dein Duell gegen ${other} ist beendet: ${pct(ownVotes)} % von ${total} Stimmen für dich. Nächstes Mal!`;

  const participants = new Set([...membersA, ...membersB]);
  const notes: Note[] = [
    ...membersA.map((userId) => ({ userId, message: resultFor(official.brandAVotes, official.brandBVotes, brandBName) })),
    ...membersB.map((userId) => ({ userId, message: resultFor(official.brandBVotes, official.brandAVotes, brandAName) })),
    ...voters.filter((v) => !participants.has(v.userId)).map((v) => ({ userId: v.userId, message: messageFor(v.votedForBrandId) })),
  ];
  await deliver(notes, title, url);
}

/**
 * Luca 22.10.: Sicherheitsnetz im täglichen Nacht-Job — beendete Duelle, die
 * (noch) niemand im Feed ausgelöst hat (z. B. ausgefallene ohne Abstimmung,
 * die gar nicht im Feed erscheinen), werden hier abgeschlossen.
 */
export async function finalizeDueBattles(): Promise<number> {
  const now = new Date();
  const due = await db
    .select({ id: battles.id })
    .from(battles)
    .where(
      and(
        isNull(battles.resultNotifiedAt),
        or(lt(battles.votingEndsAt, now), and(isNull(battles.votingEndsAt), lt(battles.productionDeadline, now))),
      ),
    );
  for (const { id } of due) await finalizeAndNotifyBattle(id).catch((err) => console.error("[battle-notify]", err));
  return due.length;
}
