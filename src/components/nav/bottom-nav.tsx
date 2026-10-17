"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, Search, User, Smartphone, type LucideIcon } from "lucide-react";

// Phase 12d: real line icons instead of emoji. Emoji render inconsistently
// across platforms (different weight/style per OS, some look like clip art)
// and read as a prototype, not a serious product — TikTok, Instagram etc.
// all use a single consistent icon set instead. lucide-react gives us that:
// one stroke width, one visual language, crisp at any size.
//
// Phase 28: "Marken" became a Suche tab (Instagram's magnifying-glass
// convention — /brands now doubles as search + trending, see that page)
// and notifications moved to a corner icon (notification-bell-button.tsx),
// freeing this down to 5 slots so "+" actually lands dead center.
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/pitches", label: "Pitches", icon: Mic },
];

export function BottomNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const searchTab = { href: "/brands", label: "Suche", icon: Search };
  // Phase 21: a real "+" tab, TikTok/Instagram-style — every posting action
  // (Solo-Pitch, Creator-Video, Partner-Casting) lives behind this one
  // entry point now instead of being buried as forms inside /profile. See
  // src/app/post/page.tsx for the picker itself.
  // Phase W (Luca 17.10.): Posten gibt es nur noch in der App — der mittlere
  // Knopf führt Website-Besucher (z. B. aus einer Instagram-Story) zur App.
  const postTab = { href: "/app", label: "App", icon: Smartphone };
  const profileTab = { href: isLoggedIn ? "/profile" : "/login", label: isLoggedIn ? "Profil" : "Anmelden", icon: User };

  // Phase 33: Posten belongs dead center (Luca) — Suche and Posten swapped
  // so it's the 3rd of 5 slots, not the 4th.
  const allTabs = [...TABS, postTab, searchTab, profileTab];

  return (
    // Phase 30: left-1/2 + -translate-x-1/2 + max-w instead of inset-x-0 —
    // keeps this aligned with the feed's own centered phone-width column
    // (feed-client.tsx) on wide/desktop viewports instead of spanning the
    // full browser window; a no-op on any real phone (viewport < 480px).
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 justify-around border-t border-white/10 bg-black/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      {allTabs.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        if (tab === postTab) {
          return (
            <Link key={tab.label} href={tab.href} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-zinc-400">
              <span className="-mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                <Icon size={22} strokeWidth={2.5} />
              </span>
              {tab.label}
            </Link>
          );
        }

        return (
          <Link
            key={tab.label}
            href={tab.href}
            // Phase 35: tapping "Feed" while already on the feed is a no-op
            // Link click by default (same route) — Luca wants that to
            // behave like every other short-video app's own tab: jump back
            // to the newest videos. feed-client.tsx listens for this event.
            onClick={() => {
              if (tab.href === "/" && pathname === "/") {
                window.dispatchEvent(new Event("markitch:feed-tab-clicked"));
              }
            }}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-orange-500" : "text-zinc-400"
            }`}
          >
            <Icon size={23} strokeWidth={active ? 2.25 : 1.75} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
