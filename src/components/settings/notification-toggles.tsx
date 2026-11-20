"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/lang-provider";
import type { NotificationKind } from "@/lib/notification-kinds";

/** Luca 20.11.: Benachrichtigungen einzeln an/aus — wie in der App (gilt für Glocke und Push). */
export function NotificationToggles() {
  const t = useT();
  const labels: Record<NotificationKind, { title: string; hint: string }> = {
    duel: { title: t("Duelle", "Duels"), hint: t("Einladungen, Start, Ergebnisse", "Invites, start, results") },
    comment: { title: t("Meinungen", "Comments"), hint: t("Zu deinen Videos", "On your videos") },
    mention: { title: t("Erwähnungen", "Mentions"), hint: t("Wenn dich jemand mit @ markiert", "When someone tags you with @") },
    follow: { title: t("Neue Follower", "New followers"), hint: "" },
    like: { title: t("Likes", "Likes"), hint: "" },
    news: { title: t("Neues von Marken", "News from brands"), hint: t("Castings und Challenges von Marken, denen du folgst", "Castings and challenges from brands you follow") },
  };
  const [kinds, setKinds] = useState<NotificationKind[] | null>(null);
  const [muted, setMuted] = useState<Set<NotificationKind>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mobile/notification-settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { kinds: NotificationKind[]; muted: NotificationKind[] }) => {
        setKinds(d.kinds);
        setMuted(new Set(d.muted));
      })
      .catch(() => setError(t("Konnte nicht geladen werden.", "Couldn’t be loaded.")));
  }, [t]);

  const toggle = (kind: NotificationKind) => {
    const previous = muted;
    const next = new Set(muted);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setMuted(next);
    setError(null);
    fetch("/api/mobile/notification-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muted: [...next] }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
      })
      .catch(() => {
        setMuted(previous);
        setError(t("Nicht gespeichert — bitte nochmal versuchen.", "Not saved — please try again."));
      });
  };

  if (!kinds) return <p className="text-sm text-zinc-500">{error ?? t("Lädt …", "Loading …")}</p>;
  return (
    <div>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="divide-y divide-zinc-800">
        {kinds.map((kind) => {
          const on = !muted.has(kind);
          return (
            <label key={kind} className="flex cursor-pointer items-center justify-between gap-4 py-3">
              <span>
                <span className="block text-sm text-white">{labels[kind].title}</span>
                {labels[kind].hint ? <span className="block text-xs text-zinc-500">{labels[kind].hint}</span> : null}
              </span>
              <input type="checkbox" role="switch" checked={on} onChange={() => toggle(kind)} className="h-5 w-9 shrink-0 accent-orange-500" />
            </label>
          );
        })}
      </div>
    </div>
  );
}
