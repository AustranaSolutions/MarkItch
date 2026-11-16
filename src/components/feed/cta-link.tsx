"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import { saveCodeAction } from "@/app/actions/saved-codes";
import { useT } from "@/components/i18n/lang-provider";

/**
 * Orangener Link-Knopf unter einem Video. Luca 13.11. (Phase 3): hat das Video
 * einen Rabattcode, steht er daneben; Antippen kopiert ihn, legt ihn unter
 * „Meine Codes“ ab (angemeldet) und öffnet den Link.
 */
export function CtaLink({
  url,
  label,
  code,
  target,
  onClick,
  className = "",
}: {
  url: string;
  label: string;
  code: string | null;
  target: { targetType: "pitch" | "battle"; targetId: string; brandId: string };
  onClick?: () => void;
  className?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  function handleClick() {
    onClick?.();
    if (!code) return;
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
      () => {},
    );
    void saveCodeAction(target).catch(() => {});
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      onClick={handleClick}
      className={`pointer-events-auto mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-500 ${className}`}
    >
      <span className="truncate">{label} →</span>
      {code ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-white/70 px-1.5 py-px font-mono text-[11px]">
          <Ticket size={11} />
          {copied ? t("kopiert", "copied") : code}
        </span>
      ) : null}
    </a>
  );
}
