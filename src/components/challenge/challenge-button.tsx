"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { sendChallenge, type ChallengeFormState } from "@/app/actions/challenge";
import { FormError, SubmitButton } from "@/components/ui";
import { DUEL_CATEGORIES, DEFAULT_DUEL_CATEGORY } from "@/lib/battle-format";
import { useT } from "@/components/i18n/lang-provider";
import { duelCategoryLabel, langOf } from "@/lib/i18n";

/**
 * Phase 40: same label as PitchChallengeButton — one action, one name, everywhere.
 * Phase 41: see PitchChallengeButton's comment — a real "Eingeladen ✓" state
 * instead of the button just reverting to its normal label once pending
 * clears, with no way to tell whether it actually sent.
 * Phase 44: category picker — this lives on a full-width profile page, so
 * (unlike PitchChallengeButton's cramped video overlay) an inline <select>
 * fits fine, no bottom sheet needed.
 */
export function ChallengeButton({ challengedBrandId }: { challengedBrandId: string }) {
  const t = useT();
  const [state, action, isPending] = useActionState<ChallengeFormState, FormData>(sendChallenge, undefined);
  const wasPending = useRef(false);
  const [sent, setSent] = useState(false);
  const [category, setCategory] = useState<string>(DEFAULT_DUEL_CATEGORY);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) setSent(true);
    wasPending.current = isPending;
  }, [isPending, state]);

  if (sent) {
    return (
      <button type="button" disabled className="mt-6 w-full rounded-lg bg-zinc-800 px-4 py-2 font-semibold text-zinc-400">
        <Check size={14} className="inline -mt-0.5 mr-1" /> {t("Eingeladen", "Invited")}
      </button>
    );
  }

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="challengedBrandId" value={challengedBrandId} />
      <div className="mb-3 text-left">
        <label htmlFor={`challenge-category-${challengedBrandId}`} className="mb-1 block text-sm font-medium text-zinc-300">
          {t("Kategorie", "Category")}
        </label>
        <select
          id={`challenge-category-${challengedBrandId}`}
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
        >
          {DUEL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {duelCategoryLabel(cat, langOf(t))}
            </option>
          ))}
        </select>
      </div>
      <FormError message={state?.error} />
      <SubmitButton>{t("Duell einladen", "Invite to duel")}</SubmitButton>
    </form>
  );
}
