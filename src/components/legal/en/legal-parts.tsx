import type { ReactNode } from "react";

// Luca 12.11.: Bausteine der englischen Rechtstexte (gleiche Optik wie die deutschen Seiten).

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="space-y-2 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

export function B({ children }: { children: ReactNode }) {
  return <strong className="text-white">{children}</strong>;
}

/** Hinweis oben: Übersetzung zur Information, verbindlich ist die deutsche Fassung. */
export function TranslationNote({ germanHref }: { germanHref: string }) {
  return (
    <p className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
      This English translation is provided for convenience. Only the{" "}
      <a href={germanHref} className="text-orange-400 hover:underline">
        German version
      </a>{" "}
      is legally binding.
    </p>
  );
}
