"use client";

import { useActionState } from "react";
import { openChallenge, type OpenChallengeFormState } from "@/app/actions/creator-challenge";
import { FormError, SubmitButton } from "@/components/ui";

/** RN-7: Marke eröffnet eine Creator-Challenge für einen Monat. */
export function OpenChallengeForm({ periods }: { periods: { period: string; label: string; taken: boolean }[] }) {
  const [state, action] = useActionState<OpenChallengeFormState, FormData>(openChallenge, undefined);
  const free = periods.filter((p) => !p.taken);
  if (free.length === 0) return <p className="text-sm text-zinc-500">Für die nächsten Monate hast du schon Challenges eröffnet.</p>;

  return (
    <form action={action}>
      <FormError message={state?.error} />
      <label className="mb-3 block text-sm text-zinc-300">
        Monat
        <select
          name="period"
          defaultValue={free[0].period}
          className="ml-2 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-white outline-none focus:border-orange-500"
        >
          {free.map((p) => (
            <option key={p.period} value={p.period}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <textarea
        name="prompt"
        required
        maxLength={200}
        rows={2}
        placeholder="Was sollen deine Creator zeigen? Z. B. „Dein bestes Workout mit unserem Shake“"
        className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
      />
      <SubmitButton>Creator-Challenge eröffnen</SubmitButton>
    </form>
  );
}
