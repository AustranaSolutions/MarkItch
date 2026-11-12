"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Flag, X } from "lucide-react";
import type { ReportTargetType } from "@/lib/moderation";
import { confirmAndBlock, type BlockTarget } from "@/lib/block-client";
import { useT } from "@/components/i18n/lang-provider";
import { langOf, reportReasonLabel } from "@/lib/i18n";

const REPORT_REASONS = [
  "Unangemessener Inhalt",
  "Spam oder Betrug",
  "Beleidigung oder Belästigung",
  "Musik ohne Rechte",
  "Urheberrechtsverletzung",
  "Sonstiges",
];

// Phase 24: one report flow, reusable everywhere content can be reported.
// The sheet itself is `fixed inset-0` (viewport-relative, not `absolute`)
// so this button works whether it's dropped into a full-screen feed card
// or a small row inside an already-scrollable list/sheet — no dependency
// on a same-size positioned ancestor.
export function ReportButton({
  targetType,
  targetId,
  isLoggedIn,
  variant = "icon",
  blockOptions = [],
}: {
  targetType: ReportTargetType;
  targetId: string;
  isLoggedIn: boolean;
  variant?: "icon" | "text";
  /** Luca 25.10.: wie in der App — im selben Blatt „<Name> blockieren“. Eigene Konten nicht übergeben. */
  blockOptions?: { name: string; target: BlockTarget }[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function openSheet() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    setReason(null);
    setNote("");
    setStatus("idle");
    setOpen(true);
  }

  async function submit() {
    if (!reason || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, note }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <button onClick={openSheet} className="pointer-events-auto flex flex-col items-center gap-1 text-white" aria-label={t("Melden", "Report")}>
          <Flag size={28} />
          <span className="text-xs font-medium">{t("Melden", "Report")}</span>
        </button>
      ) : (
        <button onClick={openSheet} className="text-xs text-zinc-500 hover:text-zinc-300">
          {t("Melden", "Report")}
        </button>
      )}

      {open &&
        // Same nested-position:fixed stacking bug as the old Bearbeiten/
        // Löschen-Menü (see solo-pitch-owner-menu-button.tsx) — a card
        // nested inside another fixed overlay (e.g. StandaloneSoloPitchFeed,
        // ReactionsOverlay) doesn't reliably stack this sheet above
        // everything on every engine. Portal to document.body sidesteps it.
        createPortal(
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full rounded-t-2xl bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {status === "sent" ? (
              <div className="py-6 text-center">
                <p className="text-sm font-semibold text-white">{t("Danke für deine Meldung.", "Thanks for your report.")}</p>
                <p className="mt-1 text-xs text-zinc-400">{t("Wir schauen uns das an.", "We’ll look into it.")}</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 rounded-full bg-zinc-800 px-4 py-2 text-sm text-white"
                >
                  {t("Schließen", "Close")}
                </button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">{t("Inhalt melden", "Report content")}</h2>
                  <button onClick={() => setOpen(false)} aria-label={t("Schließen", "Close")} className="text-zinc-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        reason === r ? "border-orange-500 text-white" : "border-zinc-800 text-zinc-300"
                      }`}
                    >
                      {reportReasonLabel(r, langOf(t))}
                    </button>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder={t("Optional: mehr Details", "Optional: more details")}
                  rows={2}
                  className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                />
                {status === "error" && <p className="mt-2 text-xs text-red-400">{t("Melden fehlgeschlagen — versuch es nochmal.", "Report failed — please try again.")}</p>}
                {blockOptions.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-zinc-800 pt-3">
                    {blockOptions.map((option) => (
                      <button
                        key={option.name}
                        onClick={() => confirmAndBlock(option.target, option.name, t)}
                        className="w-full rounded-lg border border-red-500/40 px-3 py-2 text-left text-sm text-red-400"
                      >
                        {t(`${option.name} blockieren`, `Block ${option.name}`)}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={submit}
                  disabled={!reason || status === "sending"}
                  className="mt-3 w-full rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {status === "sending" ? "…" : t("Melden", "Report")}
                </button>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
