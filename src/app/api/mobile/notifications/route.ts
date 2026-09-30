import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getNotificationsForUser, getUnreadNotificationCount } from "@/lib/notification";
import { unauthorized } from "@/lib/mobile-auth";

// RN-5: Benachrichtigungen für die App. `?countOnly=1` liefert nur die Zahl
// für das Glocken-Symbol (günstig, wird beim Öffnen des Feeds abgefragt).
export async function GET(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) return unauthorized();
  const unreadCount = await getUnreadNotificationCount(viewer.id);
  if (request.nextUrl.searchParams.get("countOnly") === "1") {
    return NextResponse.json({ unreadCount });
  }
  const rows = await getNotificationsForUser(viewer.id);
  return NextResponse.json({
    unreadCount,
    notifications: rows.map((n) => ({
      id: n.id,
      message: n.message,
      // Ältere „Pitch live“-Einträge haben nur battleId (wie NotificationList im Web).
      link: n.link ?? (n.battleId ? `/?battle=${n.battleId}` : null),
      createdAt: n.createdAt.toISOString(),
      read: n.readAt !== null,
    })),
  });
}
