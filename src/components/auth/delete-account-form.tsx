"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

export function DeleteAccountForm({ hasBrand }: { hasBrand: boolean }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [state, action] = useActionState(deleteAccount, undefined);

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="text-sm text-red-400 hover:underline">
        {t("Account löschen", "Delete account")}
      </button>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-zinc-400">
        {t(
          "Dein Account und deine Daten (Meinungen, Likes, Stimmen, Follows) werden dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.",
          "Your account and your data (comments, likes, votes, follows) will be permanently deleted. This can’t be undone.",
        )}
        {hasBrand &&
          t(" Bist du das einzige Mitglied deiner Marke, wird auch die Marke gelöscht — mit allen Videos, Duellen und Reaktionen.", " If you’re the only member of your brand, the brand will be deleted too — with all videos, duels and reactions.")}
      </p>
      <form action={action}>
        <FormError message={state?.errors?._form?.[0]} />
        <Field label={t("Passwort", "Password")} name="password" type="password" autoComplete="current-password" errors={state?.errors?.password} />
        <label className="mb-4 flex items-start gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          {t("Ich verstehe, dass das nicht rückgängig gemacht werden kann.", "I understand that this can’t be undone.")}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
          >
            {t("Abbrechen", "Cancel")}
          </button>
          <div className="flex-1">
            <fieldset disabled={!confirmed}>
              <SubmitButton>{t("Account endgültig löschen", "Delete account permanently")}</SubmitButton>
            </fieldset>
          </div>
        </div>
      </form>
    </div>
  );
}
