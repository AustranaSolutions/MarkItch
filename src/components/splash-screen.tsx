/**
 * Shown once per real app open — mounted inside RootLayout, which the App
 * Router keeps mounted across client-side navigations (Link clicks), so
 * this only ever appears on an actual page load/reload, never again while
 * just tapping around the app.
 *
 * Luca 07.10.: reines CSS (`.splash-screen` in globals.css) statt Timer im
 * Browser — so verschwindet er auch dann, wenn JavaScript nicht startet.
 */
export function SplashScreen() {
  return (
    <div
      aria-hidden
      className="splash-screen pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
    >
      <div className="text-4xl font-black tracking-tight text-white">
        Mark<span className="text-orange-500">Itch</span>
      </div>
      <p className="mt-2 text-sm text-zinc-500">Werbung wird zum Entertainment.</p>
    </div>
  );
}
