import Link from "next/link";
import { Flame, Heart, MessageCircle, Users, Vote, type LucideIcon } from "lucide-react";
import type { ViewerActivity } from "@/lib/viewer-activity";
import { ViewerReactionTiles, type ViewerReactionTile } from "@/components/profile/viewer-reaction-tiles";

// Luca 02.11.: Website = App (MarkItch-mobile components/profile/viewer-profile-view.tsx).
// Zuschauer-Profil: Serie, Zahlen, Geschmack (nur im eigenen Profil) und Reaktionsvideos.

const number = (n: number) => n.toLocaleString("de-DE");

function tasteLabel(share: number): { title: string; text: string } {
  if (share >= 0.7) return { title: "Nah am Publikum", text: "Du spürst gut, was viele anspricht." };
  if (share <= 0.4) return { title: "Eigener Kopf", text: "Du entscheidest oft anders als die Mehrheit." };
  return { title: "Ausgewogen", text: "Mal mit der Mehrheit, mal ganz anders." };
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl border border-zinc-800 bg-zinc-950 py-3">
      <Icon size={15} className="text-zinc-400" />
      <span className="mt-1 text-lg font-bold text-white">{number(value)}</span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}

export function ViewerProfile({
  activity,
  reactions,
  own,
}: {
  activity: Omit<ViewerActivity, "taste" | "reactions"> & { taste?: ViewerActivity["taste"] };
  reactions: ViewerReactionTile[];
  own: boolean;
}) {
  const streak = activity.streakDays;
  return (
    <div className="space-y-3 text-left">
      <div className={`flex items-center gap-4 rounded-2xl border p-4 ${streak > 0 ? "border-orange-500/35 bg-orange-500/10" : "border-zinc-800 bg-zinc-950"}`}>
        <Flame size={22} className={streak > 0 ? "text-orange-400" : "text-zinc-600"} />
        <div className="flex-1">
          <p className="font-bold text-white">
            {streak > 0 ? `${streak} ${streak === 1 ? "Tag" : "Tage"} in Folge dabei` : own ? "Starte eine Serie" : "Gerade keine Serie"}
          </p>
          {own && (
            <p className="text-sm text-zinc-400">
              {streak > 0
                ? "Stimm ab, like oder sag deine Meinung — jeden Tag, damit sie weiterläuft."
                : "Stimm heute bei einem Duell ab, like oder sag deine Meinung zu einem Video."}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Stat icon={Vote} value={activity.votesCast} label="Stimmen" />
        <Stat icon={Heart} value={activity.likesGiven} label="Likes" />
        <Stat icon={MessageCircle} value={activity.commentsWritten} label="Meinungen" />
        <Stat icon={Users} value={activity.followingCount} label={own ? "Folgst du" : "Folgt"} />
      </div>

      {own && (
        <div className="space-y-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Dein Geschmack</p>
          {activity.taste ? (
            <>
              <p className="font-bold text-white">{tasteLabel(activity.taste.withMajority / activity.taste.decided).title}</p>
              <p className="text-sm text-zinc-400">
                In {activity.taste.withMajority} von {activity.taste.decided} beendeten Duellen hast du gewählt wie die Mehrheit.{" "}
                {tasteLabel(activity.taste.withMajority / activity.taste.decided).text}
              </p>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="bg-orange-500" style={{ flex: activity.taste.withMajority }} />
                <div style={{ flex: activity.taste.decided - activity.taste.withMajority }} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">Es gibt kein Richtig oder Falsch — stimm einfach für das, was dir gefällt.</p>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              Nach drei beendeten Duellen, bei denen du abgestimmt hast, siehst du hier, wie dein Geschmack zur Community passt.
            </p>
          )}
        </div>
      )}

      <h3 className="pt-2 text-lg font-semibold text-white">{own ? "Deine Reaktionen" : "Reaktionen"}</h3>
      {reactions.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {own ? "Antworte mit einem eigenen Video auf ein Marken-Video: im Feed auf „Reaktionen“ tippen, dann auf „+“." : "Noch keine Reaktionen."}
        </p>
      ) : (
        <ViewerReactionTiles reactions={reactions} own={own} />
      )}

      <div className="flex justify-center gap-4 pt-3 text-sm">
        <Link href="/pitches" className="text-orange-500 hover:underline">
          Pitches ansehen →
        </Link>
        <Link href="/brands" className="text-orange-500 hover:underline">
          Marken entdecken →
        </Link>
      </div>
    </div>
  );
}
