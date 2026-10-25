import type { Instrumentation } from "next";

// Luca 25.10.: Server-Fehler → Fehler-Alarm (lib/error-alerts.ts, Mail an ADMIN_EMAILS).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : "";
  // Weiterleitungen / „nicht gefunden“ sind keine Fehler.
  if (digest.startsWith("NEXT_")) return;
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? (err.stack ?? "") : "";
  const { reportError } = await import("@/lib/error-alerts");
  await reportError(
    "server",
    message,
    `${request.method} ${request.path} (${context.routeType} ${context.routePath})${digest ? ` digest=${digest}` : ""}\n${stack}`,
  );
};
