"use client";

import { shortTimeAgo } from "@/lib/i18n";
import Link from "next/link";
import { useTransition } from "react";
import { markAllNotificationsRead } from "@/app/actions/notification";
import type { Notification } from "@/db/schema";
import { useT } from "@/components/i18n/lang-provider";

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.readAt);

  if (notifications.length === 0) {
    return <p className="text-sm text-zinc-500">{t("Noch keine Benachrichtigungen — folge Marken, um nichts zu verpassen.", "No notifications yet — follow brands so you don’t miss anything.")}</p>;
  }

  return (
    <div>
      {hasUnread && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => markAllNotificationsRead())}
          className="mb-3 text-xs font-medium text-orange-500 hover:underline disabled:opacity-50"
        >
          {t("Alle als gelesen markieren", "Mark all as read")}
        </button>
      )}
      <ul className="space-y-2">
        {notifications.map((n) => {
          const content = (
            <div
              className={
                "rounded-lg border p-3 text-sm transition-colors " +
                (n.readAt ? "border-zinc-800 text-zinc-400" : "border-orange-500/40 bg-orange-500/5 text-white")
              }
            >
              <p>{n.message}</p>
              <p className="mt-1 text-xs text-zinc-500">{shortTimeAgo(n.createdAt, t)}</p>
            </div>
          );
          // Phase 35: `link` covers every new notification type (follow/
          // like/comment); `battleId` is the older "Pitch live" fallback
          // for notifications that predate `link`.
          const href = n.link ?? (n.battleId ? `/?battle=${n.battleId}` : null);
          return (
            <li key={n.id}>
              {href ? (
                <Link href={href} className="block hover:opacity-80">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
