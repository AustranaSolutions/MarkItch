"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { requestVerificationAction, type VerificationRequestState } from "@/app/actions/brand-verify";
import { FormError, SubmitButton } from "@/components/ui";
import { useT } from "@/components/i18n/lang-provider";

/**
 * Luca 13.11. (Phase 4): Prüfung per Code — Code in die Bio (Instagram/TikTok)
 * oder auf die Website setzen, Link einreichen, MarkItch schaut nach.
 */
export function VerificationRequest({
  code,
  requestedUrl,
  defaultUrl,
  isCreator,
}: {
  code: string;
  requestedUrl: string | null;
  defaultUrl: string | null;
  isCreator: boolean;
}) {
  const t = useT();
  const [state, action] = useActionState<VerificationRequestState, FormData>(requestVerificationAction, undefined);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(requestedUrl ?? defaultUrl ?? "");

  return (
    <div>
      <p className="mb-3 text-sm text-zinc-400">
        {isCreator
          ? t(
              "Setz diesen Code kurz in deine Instagram- oder TikTok-Bio und schick uns den Link zu deinem Profil. Sobald wir ihn gesehen haben, bekommst du den Haken — danach kannst du den Code wieder entfernen.",
              "Put this code in your Instagram or TikTok bio for a moment and send us the link to your profile. Once we’ve seen it, you get the checkmark — you can remove the code afterwards.",
            )
          : t(
              "Den Haken gibt es automatisch, wenn deine bestätigte E-Mail-Adresse zur Website passt. Sonst: Setz diesen Code auf deine Website oder in deine Instagram-/TikTok-Bio und schick uns den Link dorthin.",
              "You get the checkmark automatically if your confirmed email address matches your website. Otherwise: put this code on your website or in your Instagram/TikTok bio and send us the link.",
            )}
      </p>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true))}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-dashed border-orange-500/70 px-3 py-1 font-mono text-sm text-orange-400 hover:bg-orange-500/10"
      >
        {code}
        <span className="font-sans text-xs text-zinc-400">{copied ? t("kopiert", "copied") : <Copy size={13} />}</span>
      </button>
      {requestedUrl && !state?.error ? (
        <p className="mb-3 text-sm text-green-400">
          {t("Prüfung beantragt — wir schauen bald nach.", "Verification requested — we’ll check soon.")}
        </p>
      ) : null}
      <form action={action}>
        <label htmlFor="verification-url" className="mb-1 block text-sm font-medium text-zinc-300">
          {t("Link zu Profil oder Website", "Link to profile or website")}
        </label>
        <input
          id="verification-url"
          name="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://instagram.com/…"
          className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
        />
        <FormError message={state?.error} />
        <SubmitButton>{requestedUrl ? t("Erneut prüfen lassen", "Request again") : t("Prüfen lassen", "Request verification")}</SubmitButton>
      </form>
    </div>
  );
}
