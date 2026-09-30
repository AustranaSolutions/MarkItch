import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { ChallengeButton } from "@/components/challenge/challenge-button";
import { FollowButton } from "@/components/brand/follow-button";
import { BrandProfileHeader } from "@/components/profile/brand-profile-header";
import { ProfileContentTabs } from "@/components/profile/profile-content-tabs";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getBrandProfileExtras } from "@/lib/brand-profile";
import { getFollowerCount, getFollowingCountForBrand, isFollowing } from "@/lib/follow";
import { getFeedSoloPitchesForBrand, getFeedDuelsForBrand } from "@/lib/feed";

// Note: this page already reads the session (getOptionalUser -> auth(),
// which touches cookies), so Next treats it as dynamic automatically —
// unlike /brands and /pitches, no explicit `dynamic = "force-dynamic"`
// is needed here.

export default async function BrandProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [brand] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);

  if (!brand) notFound();

  const viewer = await getOptionalUser();
  const viewerBrand = viewer ? await getBrandForUser(viewer.id) : null;
  const isOwnBrand = viewerBrand?.id === brand.id;
  const [soloPitches, duels, followerCount, followingCount, viewerFollows, extras] = await Promise.all([
    getFeedSoloPitchesForBrand(viewer?.id ?? null, brand.id),
    getFeedDuelsForBrand(viewer?.id ?? null, brand.id),
    getFollowerCount(brand.id),
    getFollowingCountForBrand(brand.id),
    viewer && !isOwnBrand ? isFollowing(viewer.id, brand.id) : Promise.resolve(false),
    getBrandProfileExtras(brand, viewerBrand?.id ?? null, isOwnBrand),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      {/* Phase 32/41: identical layout to /profile (Luca: "der Screen auf Tab
          Profil muss der selbe sein wie der Screen wenn jemand auf meinen
          Namen klickt") — both pages now share getBrandProfileExtras and
          this same set of components instead of keeping two copies that
          can silently drift apart again. */}
      <BrandProfileHeader
        name={brand.name}
        logoUrl={brand.logoUrl}
        bio={brand.description}
        postCount={soloPitches.length + duels.length}
        followerCount={followerCount}
        followingCount={followingCount}
        followersHref={`/brands/${brand.slug}/followers`}
        followingHref={`/brands/${brand.slug}/following`}
        action={
          viewer && !isOwnBrand ? (
            <div className="flex flex-col items-center gap-3">
              <FollowButton brandId={brand.id} isFollowing={viewerFollows} />
              {viewerBrand &&
                (extras.livePending ? (
                  <p className="text-center text-sm text-zinc-400">
                    {extras.livePending.challengerBrandId === viewerBrand.id
                      ? "Du hast diese Marke bereits eingeladen — Antwort steht noch aus."
                      : "Diese Marke hat dich bereits eingeladen — schau in deinem Profil vorbei."}
                  </p>
                ) : (
                  <ChallengeButton challengedBrandId={brand.id} />
                ))}
            </div>
          ) : undefined
        }
      />

      <ProfileContentTabs
        soloPitches={soloPitches}
        duels={duels}
        profileBrandId={brand.id}
        isLoggedIn={Boolean(viewer)}
        viewerBrandId={viewerBrand?.id ?? null}
        info={{
          category: extras.category,
          country: extras.country,
          website: extras.website,
          brandSlug: brand.slug,
          challenges: extras.challenges,
          challengeWinners: extras.challengeWinners,
          isOwnBrand,
          activeCasting: extras.activeCasting,
          castingWinner: extras.castingWinner,
          latestFinishedCastingId: extras.latestFinishedCastingId,
        }}
      />
    </div>
  );
}
