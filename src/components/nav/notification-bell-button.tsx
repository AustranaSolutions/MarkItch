import Link from "next/link";
import { Bell } from "lucide-react";
import { getT } from "@/lib/lang";

/**
 * Phase 28: moved out of the bottom nav (Instagram/TikTok convention —
 * notifications live as a corner icon, not a dedicated tab, freeing up a
 * bottom-nav slot).
 *
 * Phase 32: moved from top-left to top-right — Luca removed the permanent
 * mute indicator that used to sit top-right on every video card (mute is
 * now only shown contextually, alongside the pause icon, when a video is
 * actually paused), freeing that corner up for this instead.
 */
export async function NotificationBellButton({ isLoggedIn, unreadCount = 0 }: { isLoggedIn: boolean; unreadCount?: number }) {
  const t = await getT();
  if (!isLoggedIn) return null;

  return (
    <Link
      href="/notifications"
      aria-label={t("Erinnerungen", "Notifications")}
      className="fixed z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
      // Phase 30: same reasoning as bottom-nav.tsx — aligns with the feed's
      // centered 480px-max column on wide viewports (max(...) falls back to
      // the plain 16px corner offset on any real phone).
      style={{ top: "calc(env(safe-area-inset-top) + 12px)", right: "max(16px, calc(50% - 224px))" }}
    >
      <Bell size={20} strokeWidth={1.75} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
