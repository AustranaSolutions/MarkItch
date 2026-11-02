import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/session";
import { isUuid } from "@/lib/mobile-auth";
import { getPublicViewerProfile } from "@/lib/public-profile";
import { ViewerProfile } from "@/components/profile/viewer-profile";

export const metadata: Metadata = { robots: { index: false } };

/** Luca 02.11.: öffentliches Zuschauer-Profil (Name bei Meinungen/Reaktionen antippen). Website = App (app/users/[id].tsx). */
export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await getOptionalUser();
  if (viewer?.id === id) redirect("/profile");
  const profile = await getPublicViewerProfile(id, viewer?.id ?? null);
  if (!profile) notFound();
  if (profile.kind === "brand") redirect(`/brands/${profile.brandSlug}`);
  const { user, activity } = profile;
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-28 pt-6">
      <div className="mb-5 text-center">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
          <img src={user.avatarUrl} alt="" className="mx-auto h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-500">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="mt-3 text-lg font-semibold text-white">{user.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">Schaut zu, stimmt ab und reagiert mit eigenen Videos.</p>
      </div>
      <ViewerProfile activity={activity} reactions={activity.reactions} own={false} />
    </div>
  );
}
