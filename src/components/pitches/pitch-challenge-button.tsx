"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Send } from "lucide-react";
import { sendChallengeFromSoloPitch, type ChallengeFormState } from "@/app/actions/challenge";
import { FormError, SubmitButton } from "@/components/ui";
import { DUEL_CATEGORIES, DEFAULT_DUEL_CATEGORY } from "@/lib/battle-format";
import { useT } from "@/components/i18n/lang-provider";
import { duelCategoryLabel, langOf } from "@/lib/i18n";

/**
 * Luca 20.11.: wie in der App im ⋯-Menü der Karte, hier nur noch das Blatt.
 *
 * "Duell einladen" — direct invite off a solo pitch, see
 * CLAUDE-CODE-UEBERGABE.md §6. Same label/action everywhere a brand can be
 * invited to a duel (this button, ChallengeButton on a profile) — Phase 40:
 * previously called "Pitch schicken" here vs. "Einladen" on a profile,
 * two names for the same thing.
 *
 * Phase 41: sendChallenge doesn't redirect on success (unlike accepting one)
 * — the button just went back to its normal "Duell einladen" label once
 * the pending "…" cleared, indistinguishable from never having been
 * clicked. Luca: "lädt es oder wurde es versendet?" Now tracks the
 * pending→done transition itself and shows a real "Eingeladen ✓" state.
 *
 * Phase 44: Luca — "bau eine Kategorie Auswahl für Duelle". This button
 * sits in a cramped video overlay, no room for an inline <select> the way
 * ChallengeButton (a full profile page) can afford — so a tap opens a
 * small bottom sheet with the category picker instead, same shape as
 * SoloPitchOwnerMenuButton's, portaled to document.body from the start
 * (that component only learned the hard way that a bumped z-index alone
 * doesn't reliably win against another `position: fixed` ancestor across
 * every browser engine).
 */
export function PitchChallengeSheet({ soloPitchId, onClose }: { soloPitchId: string; onClose: () => void }) {
  const t = useT();
  const [state, action, isPending] = useActionState<ChallengeFormState, FormData>(sendChallengeFromSoloPitch, undefined);
  const wasPending = useRef(false);
  const [sent, setSent] = useState(false);
  const [category, setCategory] = useState<string>(DEFAULT_DUEL_CATEGORY);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setSent(true);
      const timer = setTimeout(onClose, 1200);
      wasPending.current = isPending;
      return () => clearTimeout(timer);
    }
    wasPending.current = isPending;
  }, [isPending, state, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="mx-auto w-full max-w-lg rounded-t-2xl bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <p className="py-4 text-center text-sm font-semibold text-emerald-400">
            <Check size={16} className="inline -mt-0.5 mr-1" /> {t("Eingeladen", "Invited")}
          </p>
        ) : (
          <form action={action}>
            <input type="hidden" name="soloPitchId" value={soloPitchId} />
            <div className="mb-3">
              <label htmlFor={`category-${soloPitchId}`} className="mb-1 block text-sm font-medium text-zinc-300">
                {t("Kategorie", "Category")}
              </label>
              <select
                id={`category-${soloPitchId}`}
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
            <SubmitButton>
              <Send size={14} className="inline -mt-0.5 mr-1" /> {t("Duell einladen", "Invite to duel")}
            </SubmitButton>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
