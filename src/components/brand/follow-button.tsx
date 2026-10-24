"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toggleFollow, type FollowFormState } from "@/app/actions/follow";

function ToggleButton({ following, large }: { following: boolean; large: boolean }) {
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
      {pending ? "…" : following ? "Folgt ✓" : "Folgen"}
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
