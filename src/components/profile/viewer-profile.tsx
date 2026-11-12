import Link from "next/link";
import { Flame, Heart, MessageCircle, Users, Vote, type LucideIcon } from "lucide-react";
import type { ViewerActivity } from "@/lib/viewer-activity";
import { ViewerReactionTiles, type ViewerReactionTile } from "@/components/profile/viewer-reaction-tiles";
import { getT, getLang } from "@/lib/lang";
import { type Lang, type Translate, localeOf } from "@/lib/i18n";

// Luca 02.11.: Website = App (MarkItch-mobile components/profile/viewer-profile-view.tsx).
// Zuschauer-Profil: Serie, Zahlen, Geschmack (nur im eigenen Profil) und Reaktionsvideos.

const number = (n: number, lang: Lang) => n.toLocaleString(localeOf(lang));

function tasteLabel(share: number, t: Translate): { title: string; text: string } {
  if (share >= 0.7) return { title: t("Nah am Publikum", "In tune with the crowd"), text: t("Du spürst gut, was viele anspricht.", "You have a good feel for what appeals to many.") };
  if (share <= 0.4) return { title: t("Eigener Kopf", "Independent thinker"), text: t("Du entscheidest oft anders als die Mehrheit.", "You often decide differently from the majority.") };
  return { title: t("Ausgewogen", "Balanced"), text: t("Mal mit der Mehrheit, mal ganz anders.", "Sometimes with the majority, sometimes not at all.") };
}

async function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl border border-zinc-800 bg-zinc-950 py-3">
      <Icon size={15} className="text-zinc-400" />
      <span className="mt-1 text-lg font-bold text-white">{number(value, await getLang())}</span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}

export async function ViewerProfile({
  activity,
  reactions,
  own,
}: {
  activity: Omit<ViewerActivity, "taste" | "reactions"> & { taste?: ViewerActivity["taste"] };
  reactions: ViewerReactionTile[];
  own: boolean;
}) {
  const t = await getT();
  const streak = activity.streakDays;
  return (
    <div className="space-y-3 text-left">
      <div className={`flex items-center gap-4 rounded-2xl border p-4 ${streak > 0 ? "border-orange-500/35 bg-orange-500/10" : "border-zinc-800 bg-zinc-950"}`}>
        <Flame size={22} className={streak > 0 ? "text-orange-400" : "text-zinc-600"} />
        <div className="flex-1">
          <p className="font-bold text-white">
            {streak > 0 ? t(`${streak} ${streak === 1 ? "Tag" : "Tage"} in Folge dabei`, `${streak}-day streak`) : own ? t("Starte eine Serie", "Start a streak") : t("Gerade keine Serie", "No streak right now")}
          </p>
          {own && (
            <p className="text-sm text-zinc-400">
              {streak > 0
                ? t("Stimm ab, like oder sag deine Meinung — jeden Tag, damit sie weiterläuft.", "Vote, like or comment — every day to keep it going.")
                : t("Stimm heute bei einem Duell ab, like oder sag deine Meinung zu einem Video.", "Vote on a duel today, like or comment on a video.")}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Stat icon={Vote} value={activity.votesCast} label={t("Stimmen", "Votes")} />
        <Stat icon={Heart} value={activity.likesGiven} label="Likes" />
        <Stat icon={MessageCircle} value={activity.commentsWritten} label={t("Meinungen", "Comments")} />
        <Stat icon={Users} value={activity.followingCount} label={own ? t("Folgst du", "Following") : t("Folgt", "Following")} />
      </div>

      {own && (
        <div className="space-y-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("Dein Geschmack", "Your taste")}</p>
          {activity.taste ? (
            <>
              <p className="font-bold text-white">{tasteLabel(activity.taste.withMajority / activity.taste.decided, t).title}</p>
              <p className="text-sm text-zinc-400">
                {t(`In ${activity.taste.withMajority} von ${activity.taste.decided} beendeten Duellen hast du gewählt wie die Mehrheit.`, `In ${activity.taste.withMajority} of ${activity.taste.decided} finished duels you voted with the majority.`)}{" "}
                {tasteLabel(activity.taste.withMajority / activity.taste.decided, t).text}
              </p>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="bg-orange-500" style={{ flex: activity.taste.withMajority }} />
                <div style={{ flex: activity.taste.decided - activity.taste.withMajority }} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">{t("Es gibt kein Richtig oder Falsch — stimm einfach für das, was dir gefällt.", "There’s no right or wrong — just vote for what you like.")}</p>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              {t("Nach drei beendeten Duellen, bei denen du abgestimmt hast, siehst du hier, wie dein Geschmack zur Community passt.", "After three finished duels you voted on, you’ll see here how your taste matches the community.")}
            </p>
          )}
        </div>
      )}

      <h3 className="pt-2 text-lg font-semibold text-white">{own ? t("Deine Reaktionen", "Your reactions") : t("Reaktionen", "Reactions")}</h3>
      {reactions.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {own ? t("Antworte mit einem eigenen Video auf ein Marken-Video: im Feed auf „Reaktionen“ tippen, dann auf „+“.", "Reply to a brand video with your own: tap “Reactions” in the feed, then “+”.") : t("Noch keine Reaktionen.", "No reactions yet.")}
        </p>
      ) : (
        <ViewerReactionTiles reactions={reactions} own={own} />
      )}

      <div className="flex justify-center gap-4 pt-3 text-sm">
        <Link href="/pitches" className="text-orange-500 hover:underline">
          {t("Pitches ansehen →", "View pitches →")}
        </Link>
        <Link href="/brands" className="text-orange-500 hover:underline">
          {t("Marken entdecken →", "Discover brands →")}
        </Link>
      </div>
    </div>
  );
}
