import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, notifications, users, type Notification } from "@/db/schema";
import { sendPushToUser } from "@/lib/push";

const RECENT_LIMIT = 20;

/**
 * How to refer to whoever just followed/liked/commented, from the
 * recipient's point of view — their brand name + a link to it if they have
 * one (almost everyone who can act does), else just their account name/
 * email with no link. Used to keep every "X did Y" notification's wording
 * uniform regardless of what kind of account X is.
 */
export async function getActorLabel(userId: string): Promise<{ label: string; link: string | null }> {
  const [brandRow] = await db
    .select({ name: brands.name, slug: brands.slug })
    .from(brandMembers)
    .innerJoin(brands, eq(brandMembers.brandId, brands.id))
    .where(eq(brandMembers.userId, userId))
    .limit(1);
  if (brandRow) return { label: brandRow.name, link: `/brands/${brandRow.slug}` };

  const [userRow] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return { label: userRow?.name || userRow?.email || "Jemand", link: null };
}

/**
 * Phase 35: shared insert path for follow/like/comment notifications —
 * battle-live notifications (battle-stage.ts) still insert directly since
 * they predate `link` and already have their own battleId-based fallback.
 * Silently skips notifying `excludeUserId` (acting on your own content) and
 * de-dupes recipients, since a brand can have more than one member.
 *
 * Phase 36: also sends an actual push (not just the in-app bell) to
 * whichever of a recipient's devices are subscribed — the VAPID
 * infrastructure (src/lib/push.ts) existed since Phase 12 but nothing ever
 * called it, so nobody's phone ever actually buzzed for anything, "Duell
 * live" included. `sendPushToUser` itself already no-ops per-device when
 * that device never subscribed, and no-ops entirely when VAPID keys aren't
 * configured — never blocks the in-app notification either way.
 */
export async function notifyUsers(
  userIds: string[],
  message: string,
  link: string | null,
  excludeUserId?: string,
): Promise<void> {
  const recipients = [...new Set(userIds)].filter((id) => id !== excludeUserId);
  if (recipients.length === 0) return;
  await db.insert(notifications).values(recipients.map((userId) => ({ userId, message, link })));
  await Promise.all(
    recipients.map((userId) =>
      sendPushToUser(userId, { title: "MarkItch", body: message, url: link ?? "/" }).catch(() => {}),
    ),
  );
}

/** Most recent notifications for this user, newest first. */
export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(RECENT_LIMIT);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

/** Alle ungelesenen als gelesen markieren — Web-Action und App-Route (RN-5). */
export async function markAllNotificationsReadFor(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
