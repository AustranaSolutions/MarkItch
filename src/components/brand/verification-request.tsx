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
        {t(
          "Mit dem Haken ✓ sehen alle, dass dieses Profil wirklich zu dir gehört.",
          "With the checkmark ✓ everyone can see that this profile really belongs to you.",
        )}
      </p>
      {!isCreator && (
        <p className="mb-3 text-sm text-zinc-400">
          {t(
            "Passt deine bestätigte E-Mail-Adresse zur Website deiner Marke (z. B. info@meinshop.at und meinshop.at), bekommst du den Haken automatisch. Sonst:",
            "If your confirmed email address matches your brand’s website (e.g. info@myshop.com and myshop.com), you get the checkmark automatically. Otherwise:",
          )}
        </p>
      )}
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-zinc-300">
        <li>{t("Code unten kopieren.", "Copy the code below.")}</li>
        <li>
          {isCreator
            ? t("Kurz in deine Instagram- oder TikTok-Bio setzen.", "Put it in your Instagram or TikTok bio for a moment.")
            : t("Kurz auf deine Website oder in deine Instagram-/TikTok-Bio setzen.", "Put it on your website or in your Instagram/TikTok bio for a moment.")}
        </li>
        <li>{t("Link dorthin unten einfügen und „Haken beantragen“ drücken.", "Paste the link below and press “Request checkmark”.")}</li>
      </ol>
      <p className="mb-3 text-xs text-zinc-500">
        {t("Wir schauen nach und vergeben den Haken — danach kannst du den Code wieder entfernen.", "We check and give you the checkmark — you can remove the code afterwards.")}
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
          {t("Haken beantragt — wir schauen bald nach.", "Checkmark requested — we’ll check soon.")}
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
        <SubmitButton>{requestedUrl ? t("Erneut beantragen", "Request again") : t("Haken beantragen", "Request checkmark")}</SubmitButton>
      </form>
    </div>
  );
}
