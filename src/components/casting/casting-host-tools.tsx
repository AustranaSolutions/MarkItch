"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n/lang-provider";

// Luca 18.11.: die Marke bearbeitet ihr Casting und verlängert die Einreichfrist
// (statt automatisch zu verlängern; Erinnerung kommt einen Tag vorher).
export function CastingHostTools({ castingId, prompt, canExtend }: { castingId: string; prompt: string; canExtend: boolean }) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(prompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, method: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("Nicht möglich.", "Not possible."));
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">{t("Dein Casting", "Your casting")}</h2>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={async () => (await call(`/api/mobile/castings/${castingId}`, "PATCH", { prompt: text })) && setEditing(false)}
              className="rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t("Speichern", "Save")}
            </button>
            <button onClick={() => (setEditing(false), setText(prompt))} className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300">
              {t("Abbrechen", "Cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEditing(true)} className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-500">
            {t("Text bearbeiten", "Edit text")}
          </button>
          {canExtend &&
            ([7, 14] as const).map((d) => (
              <button
                key={d}
                disabled={busy}
                onClick={() => call(`/api/mobile/castings/${castingId}/extend`, "POST", { days: d })}
                className="rounded-full border border-orange-500/50 px-4 py-1.5 text-xs font-semibold text-orange-300 hover:border-orange-400 disabled:opacity-50"
              >
                {t(`+${d} Tage verlängern`, `Extend by ${d} days`)}
              </button>
            ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
