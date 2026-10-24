import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getBrandProfileExtras } from "@/lib/brand-profile";
import { getFollowerCount, getFollowingCountForBrand, isFollowing } from "@/lib/follow";
import { getFeedSoloPitchesForBrand, getFeedDuelsForBrand } from "@/lib/feed";
import { getBlockedIds } from "@/lib/block";
import {
  defaultProfileButton,
  parseProfileButtonType,
  profileButtonSource,
  PROFILE_BUTTON_LABELS,
  publicLocationLabel,
} from "@/lib/brand-details";

/** Der eine Button im Profil — nur, wenn sein Ziel auch ausgefüllt ist. */
function profileButtonOf(brand: typeof brands.$inferSelect): { type: string; label: string; target: string } | null {
  const type = parseProfileButtonType(brand.profileButtonType);
  if (!type) return null;
  const source = profileButtonSource(type);
  const target =
    source === "phone"
      ? brand.phone && `tel:${brand.phone.replace(/[^+0-9]/g, "")}`
      : source === "email"
        ? brand.contactEmail && `mailto:${brand.contactEmail}`
        : source === "website"
          ? brand.website
          : source === "link"
            ? brand.profileButtonUrl
            : null;
  return target ? { type, label: PROFILE_BUTTON_LABELS[type], target } : null;
}

/**
 * RN-4: Markenprofil für die App — dieselben Daten wie die Seite
 * /brands/[slug] (und damit /profile für die eigene Marke), als JSON.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [brand] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Diese Marke gibt es nicht." }, { status: 404 });
  }

  const viewer = await getOptionalUser();
  const viewerBrand = viewer ? await getBrandForUser(viewer.id) : null;
  const isOwnBrand = viewerBrand?.id === brand.id;
  const [soloPitches, duels, followerCount, followingCount, viewerFollows, extras, blocked] = await Promise.all([
    getFeedSoloPitchesForBrand(viewer?.id ?? null, brand.id),
    getFeedDuelsForBrand(viewer?.id ?? null, brand.id),
    getFollowerCount(brand.id),
    getFollowingCountForBrand(brand.id),
    viewer && !isOwnBrand ? isFollowing(viewer.id, brand.id) : Promise.resolve(false),
    getBrandProfileExtras(brand, viewerBrand?.id ?? null, isOwnBrand),
    getBlockedIds(viewer?.id ?? null),
  ]);

  return NextResponse.json({
    brand: {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      logoUrl: brand.logoUrl,
      description: brand.description,
      // Audit 04.10. (C1): vom Betreiber geprüft → Haken am Namen.
      verified: brand.verifiedAt !== null,
      kind: brand.kind,
      // Luca 24.10.: neues Profil.
      category: brand.category,
      bannerUrl: brand.bannerUrl,
      introVideoUrl: brand.videoUrl,
      locationType: brand.locationType,
      locationLabel: publicLocationLabel(brand.locationType, brand.locationLabel),
      profileButton: profileButtonOf(brand),
    },
    // Luca 24.10.: Info-Blatt (⋯ → Info) und eigene Einstellungen.
    details: {
      description: brand.description,
      address: brand.locationType === "address" ? brand.address : null,
      phone: brand.phone,
      contactEmail: brand.contactEmail,
      website: brand.website,
      openingHours: brand.openingHours,
      imprint: brand.imprint,
      // Nur für die eigenen Einstellungen: was gespeichert ist, auch wenn der Button gerade nichts zeigt.
      ...(isOwnBrand
        ? {
            profileButtonType: brand.profileButtonType,
            profileButtonUrl: brand.profileButtonUrl,
            suggestedButtonType: defaultProfileButton(brand.kind, brand.category),
            rawLocationLabel: brand.locationLabel,
            rawAddress: brand.address,
          }
        : {}),
    },
    isOwnBrand,
    viewerFollows,
    followerCount,
    followingCount,
    soloPitches,
    duels,
    info: {
      category: extras.category,
      country: extras.country,
      website: extras.website,
      // RN-7: Creator-Challenges statt der alten Monats-Charts.
      challenges: extras.challenges,
      challengeWinners: extras.challengeWinners,
      activeCasting: extras.activeCasting ? { id: extras.activeCasting.id, prompt: extras.activeCasting.prompt } : null,
      castingWinner: extras.castingWinner,
      latestFinishedCastingId: extras.latestFinishedCastingId,
    },
    // RN-5b: offene Einladung zwischen eigener und dieser Marke (für den „Duell einladen“-Knopf).
    viewerHasBrand: Boolean(viewerBrand),
    // RN-7: Videos/Duelle sind dann schon leer (Feed-Filter), die App zeigt „Blockiert".
    viewerBlocked: blocked.brandIds.has(brand.id),
    livePendingChallenge: extras.livePending
      ? { sentByViewer: extras.livePending.challengerBrandId === viewerBrand?.id }
      : null,
  });
}
