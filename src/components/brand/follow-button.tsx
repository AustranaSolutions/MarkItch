"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toggleFollow, type FollowFormState } from "@/app/actions/follow";
import { UserCheck, UserPlus } from "lucide-react";
import { useT } from "@/components/i18n/lang-provider";

function ToggleButton({ following, large }: { following: boolean; large: boolean }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        (large ? "h-10 w-full rounded-full text-sm font-bold transition-colors disabled:opacity-50 " : "rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ") +
        (following
          ? "border border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-red-400"
          : large
            ? "bg-orange-500 text-[#0e2328] hover:bg-orange-400"
            : "bg-orange-600 text-white hover:bg-orange-500")
      }
    >
      {pending ? "…" : following ? t("Folgt ✓", "Following ✓") : t("Folgen", "Follow")}
    </button>
  );
}

export function FollowButton({ brandId, isFollowing, large = false }: { brandId: string; isFollowing: boolean; /** Luca 24.10.: große Variante im Profil. */ large?: boolean }) {
  const [state, action, isPending] = useActionState<FollowFormState, FormData>(toggleFollow, undefined);
  // Phase 43: the label used to wait on the whole page's server-triggered
  // refresh to reflect the new state — Luca: "im Profil wenn ich klicke
  // sind nur die drei Punkte", on a page whose data reload is slow that
  // could sit stuck well past when the click itself actually succeeded.
  // Flip locally the instant the action resolves instead, same fix as
  // ChallengeButton/PitchChallengeButton.
  const [following, setFollowing] = useState(isFollowing);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) setFollowing((f) => !f);
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form action={action}>
      <input type="hidden" name="brandId" value={brandId} />
      <ToggleButton following={following} large={large} />
      {state?.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

/**
 * Luca 13.11.: Folgen in der rechten Leiste über dem Herz (wie in der App):
 * Person+ „Folgen“ bzw. orangener Haken „Folgt“ — der Text unten bleibt ruhig.
 */
export function RailFollowButton({ brandId, isFollowing, isLoggedIn }: { brandId: string; isFollowing: boolean; isLoggedIn: boolean }) {
  const t = useT();
  const [state, action, isPending] = useActionState<FollowFormState, FormData>(toggleFollow, undefined);
  const [following, setFollowing] = useState(isFollowing);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) setFollowing((f) => !f);
    wasPending.current = isPending;
  }, [isPending, state]);

  const inner = (
    <>
      {following ? <UserCheck size={28} className="text-orange-400" /> : <UserPlus size={28} />}
      <span className="text-xs font-medium">{following ? t("Folgt", "Following") : t("Folgen", "Follow")}</span>
    </>
  );
  if (!isLoggedIn) {
    return (
      <a href="/login" className="pointer-events-auto flex flex-col items-center gap-1 text-white">
        {inner}
      </a>
    );
  }
  return (
    <form action={action} className="pointer-events-auto">
      <input type="hidden" name="brandId" value={brandId} />
      <button
        type="submit"
        disabled={isPending}
        aria-label={following ? t("Nicht mehr folgen", "Unfollow") : t("Folgen", "Follow")}
        className="flex flex-col items-center gap-1 text-white disabled:opacity-60"
      >
        {inner}
      </button>
    </form>
  );
}
