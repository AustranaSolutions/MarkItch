import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BarChart3, Clapperboard, Link2, Music, Swords, Ticket, Trophy } from "lucide-react";
import { APP_STORE_LIVE, APP_STORE_URL } from "@/lib/feature-flags";
import { getT } from "@/lib/lang";
import { type Translate } from "@/lib/i18n";

// Luca 13.11. (Phase 5): Landingpage für Unternehmen — was MarkItch einer
// Marke bringt, wie es geht, was es kostet. Zahlen nur, was wirklich stimmt
// (keine erfundenen Nutzerzahlen). Verlinkt von /app.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("MarkItch für Unternehmen", "MarkItch for businesses"),
    description: t(
      "Zeig dein Produkt in einem kurzen Video, tritt im Duell gegen andere Marken an und miss, wie viele Zuschauer auf deinen Link tippen.",
      "Show your product in a short video, go head to head with other brands and measure how many viewers tap your link.",
    ),
  };
}

const BENEFITS = (t: Translate) => [
  {
    icon: Swords,
    title: t("Werbung, die man freiwillig ansieht", "Ads people choose to watch"),
    text: t(
      "Im Duell treten zwei Marken mit derselben Aufgabe an. Die Zuschauer stimmen ab — dadurch schauen sie wirklich hin, statt weiterzuwischen.",
      "In a duel, two brands take on the same task. Viewers vote — so they actually watch instead of swiping past.",
    ),
  },
  {
    icon: Link2,
    title: t("Jeder Klick ist messbar", "Every click is measurable"),
    text: t(
      "Unter jedem Video steht dein Link: Shop, Speisekarte, Termin, Route. Du siehst, wie oft er angetippt wird — gesamt und pro Video.",
      "Your link sits under every video: shop, menu, booking, directions. You see how often it’s tapped — overall and per video.",
    ),
  },
  {
    icon: Ticket,
    title: t("Rabattcodes, die nicht verloren gehen", "Discount codes that don’t get lost"),
    text: t(
      "Gib einen Code wie HALLO10 an. Wer auf deinen Link tippt, hat ihn sofort kopiert und findet ihn später unter „Meine Codes“ wieder.",
      "Add a code like HELLO10. Whoever taps your link has it copied right away and finds it again later under “My codes”.",
    ),
  },
  {
    icon: Music,
    title: t("Musik ohne Lizenzsorgen", "Music without licensing worries"),
    text: t(
      "Leg Songs aus der MarkItch-Bibliothek unter dein Video — frei nutzbar, Lautstärke und Originalton regelst du selbst.",
      "Put songs from the MarkItch library under your video — free to use, and you control the volume and original sound.",
    ),
  },
  {
    icon: BadgeCheck,
    title: t("Geprüfte Marken", "Verified brands"),
    text: t(
      "Passt deine E-Mail-Adresse zu deiner Website, bekommst du den Prüf-Haken automatisch. So wissen Zuschauer und Gegner, dass wirklich du postest.",
      "If your email address matches your website, you get the checkmark automatically. Viewers and opponents know it’s really you posting.",
    ),
  },
  {
    icon: BarChart3,
    title: t("Deine Zahlen, gratis", "Your numbers, free"),
    text: t(
      "Aufrufe, Link-Klicks, Stimmen, Likes, Follower und Teilen — für dein Profil und jedes einzelne Video.",
      "Views, link clicks, votes, likes, followers and shares — for your profile and every single video.",
    ),
  },
];

const STEPS = (t: Translate) => [
  {
    icon: Clapperboard,
    title: t("Profil anlegen", "Create a profile"),
    text: t("App laden, als Unternehmen registrieren, Website angeben. Dauert zwei Minuten.", "Get the app, sign up as a business, add your website. Takes two minutes."),
  },
  {
    icon: Trophy,
    title: t("Video posten oder herausfordern", "Post a video or challenge someone"),
    text: t(
      "Ein kurzes Video (bis 1 Minute) mit Link — oder fordere eine andere Marke zum Duell mit einer Aufgabe wie „One Take“ oder „Kinofilm“.",
      "A short video (up to 1 minute) with your link — or challenge another brand to a duel with a task like “One Take” or “Movie trailer”.",
    ),
  },
  {
    icon: Link2,
    title: t("Teilen und Klicks sammeln", "Share and collect clicks"),
    text: t(
      "Teil dein Duell in deiner Insta-Story, damit deine Kunden für dich stimmen. Jede Stimme bringt neue Zuschauer auf dein Profil.",
      "Share your duel in your Insta story so your customers vote for you. Every vote brings new viewers to your profile.",
    ),
  },
];

const FAQ = (t: Translate) => [
  {
    q: t("Was kostet MarkItch?", "What does MarkItch cost?"),
    a: t(
      "Posten, Duelle und deine Statistik sind kostenlos. Später kommen optionale Extras dazu, z. B. mehr Reichweite für ein Video — immer freiwillig.",
      "Posting, duels and your statistics are free. Optional extras will come later, e.g. more reach for a video — always voluntary.",
    ),
  },
  {
    q: t("Ich habe keine Agentur — schaffe ich das?", "I don’t have an agency — can I do this?"),
    a: t(
      "Ja. Ein Handy reicht. Die Aufgaben im Duell sind bewusst kreativ statt aufwendig — oft gewinnt das ehrlichste Video, nicht das teuerste.",
      "Yes. A phone is enough. Duel tasks are creative rather than elaborate — often the most honest video wins, not the most expensive one.",
    ),
  },
  {
    q: t("Kann ich vorhandene Werbevideos verwenden?", "Can I use existing ad videos?"),
    a: t(
      "Ja, solange du die Rechte an Bild und Ton hast. Musik aus Instagram oder TikTok ist nur dort lizenziert — nimm stattdessen einen Song aus der MarkItch-Bibliothek.",
      "Yes, as long as you hold the rights to picture and sound. Music from Instagram or TikTok is only licensed there — use a song from the MarkItch library instead.",
    ),
  },
  {
    q: t("Was passiert, wenn ich ein Duell verliere?", "What if I lose a duel?"),
    a: t(
      "Du bekommst trotzdem Aufrufe, Klicks und Follower. Das Ergebnis bleibt bis zum Ende verdeckt, und jedes Duell ist eine neue Chance.",
      "You still get views, clicks and followers. The result stays hidden until the end, and every duel is a new chance.",
    ),
  },
];

export default async function BusinessLandingPage() {
  const t = await getT();
  const cta = APP_STORE_LIVE ? APP_STORE_URL : "/app";

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 pb-32 pt-16">
      <div className="text-sm font-semibold uppercase tracking-wide text-orange-500">{t("Für Unternehmen", "For businesses")}</div>
      <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
        {t("Dein Produkt im Duell.", "Your product in a duel.")}
        <br />
        <span className="text-orange-500">{t("Die Zuschauer entscheiden.", "Viewers decide.")}</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-zinc-300">
        {t(
          "MarkItch macht Werbung zum Wettbewerb: kurze Videos, echte Abstimmungen, messbare Link-Klicks. Kostenlos für Unternehmen und Creator.",
          "MarkItch turns advertising into a competition: short videos, real votes, measurable link clicks. Free for businesses and creators.",
        )}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={cta} className="rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-500">
          {t("Kostenlos starten", "Start for free")}
        </a>
        <Link href="/" className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500">
          {t("Duelle ansehen", "Watch duels")}
        </Link>
      </div>

      <section className="mt-16 grid gap-4 sm:grid-cols-2">
        {BENEFITS(t).map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <Icon size={22} className="text-orange-500" />
            <h2 className="mt-3 font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{text}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold text-white">{t("So funktioniert’s", "How it works")}</h2>
        <ol className="mt-6 space-y-4">
          {STEPS(t).map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-bold text-orange-400">
                {i + 1}
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <Icon size={16} className="text-orange-500" /> {title}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold text-white">{t("Häufige Fragen", "FAQ")}</h2>
        <div className="mt-6 divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
          {FAQ(t).map(({ q, a }) => (
            <details key={q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium text-white marker:hidden">
                {q}
                <span className="float-right text-zinc-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-zinc-400">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-3xl bg-gradient-to-br from-orange-600 to-orange-500 p-8 text-center">
        <h2 className="text-2xl font-black text-white">{t("Bereit fürs erste Duell?", "Ready for your first duel?")}</h2>
        <p className="mt-2 text-sm text-orange-50">
          {t("Kostenlos, in zwei Minuten eingerichtet.", "Free, set up in two minutes.")}{" "}
          {t("Fragen?", "Questions?")}{" "}
          <a href="mailto:support@markitch.com" className="underline">
            support@markitch.com
          </a>
        </p>
        <a href={cta} className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50">
          {t("App laden", "Get the app")}
        </a>
      </section>

      <div className="mt-10 flex justify-center gap-4 text-xs text-zinc-600">
        <Link href="/impressum" className="hover:text-zinc-400">{t("Impressum", "Legal notice")}</Link>
        <Link href="/datenschutz" className="hover:text-zinc-400">{t("Datenschutz", "Privacy")}</Link>
        <Link href="/nutzungsbedingungen" className="hover:text-zinc-400">{t("Nutzungsbedingungen", "Terms of Use")}</Link>
      </div>
    </div>
  );
}
