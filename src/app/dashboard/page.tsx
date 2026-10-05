import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getBrandAnalyticsSummary, getBrandContentBreakdown } from "@/lib/analytics";

// Phase 16: always live — a brand checking their own numbers right after
// posting shouldn't see a stale prerendered page.
export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value.toLocaleString("de-DE")}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days < 1) return "heute";
  if (days === 1) return "vor 1 Tag";
  return `vor ${days} Tagen`;
}

/**
 * Phase 16: the "main reason to post a second time" screen — every number a
 * brand can earn (views, likes, comments, votes, reactions, shares,
 * follower), plus per-video breakdown so they see what actually landed.
 * Own-brand only, no public leaderboard — this isn't a ranking, it's a
 * mirror.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const brand = await getBrandForUser(user.id);
  if (!brand) redirect("/profile");

  const [summary, items] = await Promise.all([getBrandAnalyticsSummary(brand.id), getBrandContentBreakdown(brand.id)]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-white">Dashboard</h1>
      <p className="mb-6 text-sm text-zinc-500">Wie {brand.name} bei MarkItch performt.</p>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatCard label="Views" value={summary.views} />
        <StatCard label="Likes" value={summary.likesReceived} />
        <StatCard label="Stimmen" value={summary.votesReceived} />
        <StatCard label="Kommentare" value={summary.commentsReceived} />
        <StatCard label="Reaktionen" value={summary.reactionsReceived} />
        <StatCard label="Shares" value={summary.shares} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <StatCard label="Link-Klicks" value={summary.ctaClicks} />
        <StatCard label="Follower" value={summary.followerCount} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-white">Deine Videos</h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Noch nichts gepostet —{" "}
          <Link href="/profile" className="text-orange-400 hover:underline">
            leg im Profil los
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{item.label}</span>
                <span className="text-xs text-zinc-600">{timeAgo(item.createdAt)}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>👁 {item.viewCount}</span>
                <span>🔗 {item.ctaClickCount}</span>
                <span>❤️ {item.likeCount}</span>
                <span>💬 {item.commentCount}</span>
                {item.kind === "solo" && <span>🔁 {item.reactionCount}</span>}
                {item.kind === "battle" && (
                  <span>
                    🏆 {item.votesForThisBrand}/{item.votesTotal} Stimmen
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
