// Luca 16.11. (Phasen-Map 3.4): Benachrichtigungen einzeln an/aus.
// Hinweise der Moderation, zur Prüfung des Kontos usw. lassen sich nicht abschalten.
export const NOTIFICATION_KINDS = ["duel", "comment", "mention", "follow", "like", "news"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export function parseMutedKinds(value: unknown): NotificationKind[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is NotificationKind => (NOTIFICATION_KINDS as readonly string[]).includes(v as string)))];
}
