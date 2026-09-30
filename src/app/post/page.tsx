import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getBattlesAwaitingVideoFrom } from "@/lib/upcoming-battles";
import { getActiveCastingForBrand } from "@/lib/casting";
import { CreateBrandForm } from "@/components/brand/create-brand-form";
import { PostTypePicker } from "@/components/post/post-type-picker";
import { getOpenChallengesForBrand, openablePeriods } from "@/lib/creator-challenge";
import { periodLabel } from "@/lib/creator-charts";

// This page reads the session via requireUser() -> auth() (cookies), so
// it's already dynamic — no explicit flag needed, same as /profile.

/**
 * Phase 21: the single entry point for posting anything — Solo-Pitch,
 * Creator-Video, or starting a Partner-Casting. Used to be three separate
 * upload forms buried inside /profile, which doesn't match how any actual
 * app works (Profil should show who you are and what you've posted, not
 * hide the "post" action inside a settings-like page) — see chat
 * 2026-09-14 / CLAUDE-CODE-UEBERGABE.md for the reasoning. Reached via the
 * "+" tab in the bottom nav, TikTok/Instagram-style.
 */
export default async function PostPage() {
  const sessionUser = await requireUser();
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  const brand = await getBrandForUser(sessionUser.id);

  if (!brand) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
        <h1 className="mb-6 text-2xl font-bold text-white">Posten</h1>
        {user?.accountType === "acro" ? (
          <>
            <p className="mb-6 text-sm text-zinc-400">Leg zuerst deine Marke an, dann kannst du posten.</p>
            <CreateBrandForm />
          </>
        ) : (
          <p className="text-sm text-zinc-400">
            Als Assent schaust du zu, folgst und stimmst ab — Posten ist Marken (Acro-Accounts) vorbehalten.
          </p>
        )}
      </div>
    );
  }

  // Battles where this brand accepted a challenge (or is countering) but
  // hasn't uploaded its own side yet — easy to forget since that upload
  // otherwise only lives on /pitches/[id]'s waiting room.
  const [ownChallenges, activeCasting, pendingBattles] = await Promise.all([
    getOpenChallengesForBrand(brand.id),
    getActiveCastingForBrand(brand.id),
    getBattlesAwaitingVideoFrom(brand.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Posten</h1>

      {pendingBattles.length > 0 && (
        <div className="mb-6 rounded-lg border border-orange-500/40 bg-orange-500/10 p-4">
          <p className="mb-2 text-sm text-orange-300">Dein Video für ein Duell fehlt noch:</p>
          <ul className="space-y-1">
            {pendingBattles.map((b) => {
              const opponent = b.brandAId === brand.id ? b.brandB : b.brandA;
              return (
                <li key={b.id}>
                  <Link href={`/pitches/${b.id}`} className="text-sm font-semibold text-orange-400 hover:underline">
                    vs. {opponent.name} — Video hochladen →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <PostTypePicker
        challengePeriods={openablePeriods().map((p) => ({ ...p, taken: ownChallenges.some((c) => c.period === p.period) }))}
        ownChallenges={ownChallenges.map((c) => ({ id: c.id, prompt: c.prompt, periodLabel: periodLabel(c.period) }))}
        activeCasting={activeCasting ? { id: activeCasting.id, prompt: activeCasting.prompt } : null}
      />
    </div>
  );
}
