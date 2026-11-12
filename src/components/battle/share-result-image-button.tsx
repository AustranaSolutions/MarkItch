"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/lang-provider";

/**
 * Phase 17: the actual "post this as a Story" path — a link preview card is
 * great for chat apps, but Instagram/TikTok Stories need a real image file,
 * not a URL. Reuses the same opengraph-image.tsx output the link preview
 * already generates, just fetched and handed to the OS share sheet
 * directly instead of left for a crawler to find.
 */
export function ShareResultImageButton({
  battleId,
  brandAName,
  brandBName,
}: {
  battleId: string;
  brandAName: string;
  brandBName: string;
}) {
  const t = useT();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(`/battles/${battleId}/opengraph-image`);
      const blob = await res.blob();
      const file = new File([blob], `markitch-${battleId}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t(`${brandAName} vs. ${brandBName} auf MarkItch`, `${brandAName} vs. ${brandBName} on MarkItch`),
        });
      } else {
        // Desktop / no file-share support: open the image so it can be
        // saved manually — a plain download link would just silently fail
        // in some sandboxed contexts, opening in a tab always works.
        window.open(`/battles/${battleId}/opengraph-image`, "_blank");
      }
      setState("done");
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="w-full rounded-lg border border-zinc-700 px-4 py-2.5 font-semibold text-zinc-200 hover:border-orange-400 hover:text-orange-400 disabled:opacity-50"
    >
      {state === "loading" ? "…" : t("🖼️ Ergebnis-Bild teilen", "🖼️ Share result image")}
    </button>
  );
}
