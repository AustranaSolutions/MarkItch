import "server-only";
import { after } from "next/server";
import { getFollowerUserIds } from "@/lib/follow";
import { notifyUsers, type Msg } from "@/lib/notification";

/**
 * Luca 02.11.: Eröffnet eine Marke eine Challenge oder ein Partner-Casting,
 * bekommen ihre Follower eine Benachrichtigung (Glocke + Push); Antippen führt
 * direkt dorthin (`link`, App: lib/open-link.ts). Läuft nach der Antwort
 * (`after`), damit das Eröffnen bei vielen Followern nicht wartet.
 */
export function notifyFollowersOfNewCall(brand: { id: string }, message: Msg, link: string): void {
  after(async () => {
    const followers = await getFollowerUserIds(brand.id);
    await notifyUsers(followers, message, link);
  });
}
