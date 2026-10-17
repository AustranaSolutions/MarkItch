import type { Metadata } from "next";
import Link from "next/link";
import { APP_STORE_LIVE, APP_STORE_URL } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "MarkItch – die App",
  description: "Marken treten mit kurzen Videos gegeneinander an – du entscheidest, wer gewinnt.",
};

// Phase W (Luca 17.10.): Posten, Duelle starten und alles Weitere gibt es
// nur noch in der App. Die Website bleibt zum Ansehen, Abstimmen über
// geteilte Links und für die Rechtstexte.
const POINTS = [
  { title: "Duelle", text: "Zwei Marken, eine Aufgabe. Du stimmst ab, das Ergebnis bleibt bis zum Schluss verdeckt." },
  { title: "Videos", text: "Wisch durch kurze Videos von Marken – vom Café ums Eck bis zum Startup." },
  { title: "Mitmachen", text: "Antworte mit deinem eigenen Video oder teil ein Duell in deiner Instagram-Story." },
];

export default function AppPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-32 pt-16">
      <div className="text-4xl font-black tracking-tight text-white">
        Mark<span className="text-orange-500">Itch</span>
      </div>
      <p className="mt-3 text-lg text-zinc-300">Werbung wird zum Entertainment. Marken im Duell – du entscheidest.</p>

      <div className="mt-8">
        {APP_STORE_LIVE ? (
          <a
            href={APP_STORE_URL}
            className="flex w-full items-center justify-center rounded-xl bg-orange-600 py-4 text-base font-bold text-white hover:bg-orange-500"
          >
            Im App Store laden
          </a>
        ) : (
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-4 text-center">
            <p className="font-bold text-white">Bald im App Store</p>
            <p className="mt-1 text-sm text-zinc-400">Bis dahin kannst du hier ansehen und abstimmen.</p>
          </div>
        )}
        <Link href="/" className="mt-3 block text-center text-sm text-zinc-400 hover:text-zinc-200">
          Weiter auf der Website ansehen →
        </Link>
      </div>

      <ul className="mt-10 space-y-5">
        {POINTS.map((p) => (
          <li key={p.title} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="font-semibold text-white">{p.title}</p>
            <p className="mt-1 text-sm text-zinc-400">{p.text}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-zinc-500">
        Du bist eine Marke? Posten, Duelle starten und deine Statistik gibt es in der App.
      </p>

      <div className="mt-8 flex gap-4 text-xs text-zinc-600">
        <Link href="/impressum" className="hover:text-zinc-400">Impressum</Link>
        <Link href="/datenschutz" className="hover:text-zinc-400">Datenschutz</Link>
        <Link href="/nutzungsbedingungen" className="hover:text-zinc-400">Nutzungsbedingungen</Link>
      </div>
    </div>
  );
}
