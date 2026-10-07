import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getOptionalUser } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/notification";
import { BottomNav } from "@/components/nav/bottom-nav";
import { NotificationBellButton } from "@/components/nav/notification-bell-button";
import { SplashScreen } from "@/components/splash-screen";
import { SessionBoot } from "@/components/analytics/session-boot";

export const metadata: Metadata = {
  title: "MarkItch",
  description: "Werbung wird zum Entertainment.",
};

// Phase 41: no viewport config existed at all, so pinch-zoom and double-tap-
// zoom stayed fully active — Luca, on a real touchscreen: swiping a Duell's
// two sides "man kann Kreise machen mit dem Video", the whole screen
// dragging "wie ein rangezoomtes Foto". That's the browser's own native
// zoom/pan taking over the gesture, not this app's swipe logic — a TikTok-
// style full-screen touch app needs it off entirely, same as the native
// app it's meant to feel like.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getOptionalUser();
  const unreadCount = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <html lang="de" className="h-full antialiased dark">
      <body className="flex min-h-full flex-col bg-black text-white font-sans">
        {/* Luca 07.10.: Browser-Fehler (auch vor dem Start von React) an den Server melden, max. 5 pro Seite. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var n=0;function s(m){if(n++>=5)return;try{navigator.sendBeacon("/api/client-error",location.pathname+" :: "+m)}catch(e){}}addEventListener("error",function(e){s((e.message||"Ladefehler")+" @ "+(e.filename||(e.target&&(e.target.src||e.target.href))||"")+":"+(e.lineno||""))},true);addEventListener("unhandledrejection",function(e){s("Promise: "+(e.reason&&(e.reason.stack||e.reason.message)||e.reason))})})();`,
          }}
        />
        <SplashScreen />
        <SessionBoot />
        {children}
        <NotificationBellButton isLoggedIn={Boolean(user)} unreadCount={unreadCount} />
        <BottomNav isLoggedIn={Boolean(user)} />
      </body>
    </html>
  );
}
