import type { Metadata } from "next";
import Link from "next/link";
import { APP_STORE_LIVE, APP_STORE_URL } from "@/lib/feature-flags";
import { getLangSetting, getT } from "@/lib/lang";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { type Translate } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("MarkItch – die App", "MarkItch – the app"),
    description: t(
      "Marken treten mit kurzen Videos gegeneinander an – du entscheidest, wer gewinnt.",
      "Brands compete with short videos – you decide who wins.",
    ),
  };
}

// Phase W (Luca 17.10.): Posten, Duelle starten und alles Weitere gibt es
// nur noch in der App. Die Website bleibt zum Ansehen, Abstimmen über
// geteilte Links und für die Rechtstexte.
const POINTS = (t: Translate) => [
  { title: t("Duelle", "Duels"), text: t("Zwei Marken, eine Aufgabe. Du stimmst ab, das Ergebnis bleibt bis zum Schluss verdeckt.", "Two brands, one challenge. You vote, and the result stays hidden until the end.") },
  { title: "Videos", text: t("Wisch durch kurze Videos von Marken – vom Café ums Eck bis zum Startup.", "Swipe through short videos from brands – from the café around the corner to the startup.") },
  { title: t("Mitmachen", "Join in"), text: t("Antworte mit deinem eigenen Video oder teil ein Duell in deiner Instagram-Story.", "Reply with your own video or share a duel in your Instagram story.") },
];

export default async function AppPage() {
  const t = await getT();
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-32 pt-16">
      <div className="text-4xl font-black tracking-tight text-white">
        Mark<span className="text-orange-500">Itch</span>
      </div>
      <p className="mt-3 text-lg text-zinc-300">{t("Werbung wird zum Entertainment. Marken im Duell – du entscheidest.", "Advertising becomes entertainment. Brands go head to head – you decide.")}</p>

      <div className="mt-8">
        {APP_STORE_LIVE ? (
          <a
            href={APP_STORE_URL}
            className="flex w-full items-center justify-center rounded-xl bg-orange-600 py-4 text-base font-bold text-white hover:bg-orange-500"
          >
            {t("Im App Store laden", "Download on the App Store")}
          </a>
        ) : (
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-4 text-center">
            <p className="font-bold text-white">{t("Bald im App Store", "Coming soon to the App Store")}</p>
            <p className="mt-1 text-sm text-zinc-400">{t("Bis dahin kannst du hier ansehen und abstimmen.", "Until then you can watch and vote here.")}</p>
          </div>
        )}
        <Link href="/" className="mt-3 block text-center text-sm text-zinc-400 hover:text-zinc-200">
          {t("Weiter auf der Website ansehen →", "Keep watching on the website →")}
        </Link>
      </div>

      <ul className="mt-10 space-y-5">
        {POINTS(t).map((p) => (
          <li key={p.title} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="font-semibold text-white">{p.title}</p>
            <p className="mt-1 text-sm text-zinc-400">{p.text}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-zinc-500">
        {t("Du bist eine Marke? Posten, Duelle starten und deine Statistik gibt es in der App.", "Are you a brand? Posting, starting duels and your stats are in the app.")}
      </p>

      <div className="mt-8 flex gap-4 text-xs text-zinc-600">
        <Link href="/impressum" className="hover:text-zinc-400">{t("Impressum", "Legal notice")}</Link>
        <Link href="/datenschutz" className="hover:text-zinc-400">{t("Datenschutz", "Privacy")}</Link>
        <Link href="/nutzungsbedingungen" className="hover:text-zinc-400">{t("Nutzungsbedingungen", "Terms of Use")}</Link>
      </div>
      <LanguageSwitcher setting={await getLangSetting()} className="mt-4" />
    </div>
  );
}
