"use client";

import { useActionState } from "react";
import { respondToChallenge, cancelChallenge, type RespondFormState, type CancelFormState } from "@/app/actions/challenge";
import { useFormStatus } from "react-dom";
import { useT } from "@/components/i18n/lang-provider";

function TinyButton({ children, tone }: { children: string; tone: "accept" | "decline" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 " +
        (tone === "accept" ? "bg-green-600 text-white hover:bg-green-500" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")
      }
    >
      {pending ? "…" : children}
    </button>
  );
}

export function RespondButtons({ challengeId }: { challengeId: string }) {
  const t = useT();
  const [acceptState, acceptAction] = useActionState<RespondFormState, FormData>(respondToChallenge, undefined);
  const [declineState, declineAction] = useActionState<RespondFormState, FormData>(respondToChallenge, undefined);
  const error = acceptState?.error ?? declineState?.error;

  return (
    <div>
      <div className="flex gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="challengeId" value={challengeId} />
          <input type="hidden" name="decision" value="accept" />
          <TinyButton tone="accept">{t("Annehmen", "Accept")}</TinyButton>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="challengeId" value={challengeId} />
          <input type="hidden" name="decision" value="decline" />
          <TinyButton tone="decline">{t("Ablehnen", "Decline")}</TinyButton>
        </form>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

/** The challenger's side of a still-pending outgoing invitation — withdraw it. */
export function CancelChallengeButton({ challengeId }: { challengeId: string }) {
  const t = useT();
  const [state, action] = useActionState<CancelFormState, FormData>(cancelChallenge, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="challengeId" value={challengeId} />
      <TinyButton tone="decline">{t("Zurückziehen", "Withdraw")}</TinyButton>
      {state?.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
