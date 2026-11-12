"use client";

import { useEffect } from "react";
import { useT } from "@/components/i18n/lang-provider";

// Phase 38: Luca's report — tapping something in the feed (iPhone, Google
// app's in-app browser) did nothing, and afterwards NOTHING was clickable
// anymore, only scrolling still worked. That split (native scroll fine,
// React-driven clicks dead) is exactly what an uncaught render-time error
// looks like with no error boundary anywhere in the app: the crashed
// component unmounts, the page is stuck showing whatever HTML already
// painted, but nothing further ever re-renders. This doesn't fix whatever
// specific thing throws — it turns "silently frozen forever" into "one tap
// to recover" instead. `retry` (not `reset`) is this Next.js version's
// actual prop name — see node_modules/next/dist/docs/.../error-handling.md.
export default function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error("[error boundary]", error);
    // Luca 25.10.: Fehler-Alarm (/api/client-error → lib/error-alerts.ts).
    try {
      navigator.sendBeacon("/api/client-error", `${location.pathname} :: Seite abgestürzt: ${error.message}${error.digest ? ` (digest ${error.digest})` : ""}`);
    } catch {}
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="text-lg font-semibold text-white">{t("Etwas ist schiefgelaufen.", "Something went wrong.")}</p>
      <p className="text-sm text-zinc-400">{t("Das ist ein Fehler in der App, nicht bei dir — einfach nochmal versuchen.", "That’s a bug on our side, not yours — just try again.")}</p>
      <button
        onClick={retry}
        className="rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-500"
      >
        {t("Nochmal versuchen", "Try again")}
      </button>
    </div>
  );
}
