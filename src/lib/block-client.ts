// Luca 25.10.: Blockieren im Web — gleiche Schnittstelle wie die App (/api/mobile/blocks, Login per Cookie).

import type { Translate } from "@/lib/i18n";

export type BlockTarget = { brandId: string } | { userId: string };

export async function setBlocked(target: BlockTarget, blocked: boolean): Promise<void> {
  const res = await fetch("/api/mobile/blocks", {
    method: blocked ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Hat nicht geklappt — bitte nochmal versuchen.");
  }
}

/** Bestätigen wie in der App (moderation-menu.ts), dann blockieren und Seite neu laden (Feeds filtern serverseitig). */
export async function confirmAndBlock(target: BlockTarget, name: string, t: Translate): Promise<boolean> {
  const ok = window.confirm(
    t(
      `${name} blockieren?\n\nDu siehst dann keine Videos, Duelle, Reaktionen und Meinungen mehr von ${name}. Freigeben kannst du jederzeit in den Einstellungen unter „Blockierte Konten“.`,
      `Block ${name}?\n\nYou won’t see any more videos, duels, reactions or comments from ${name}. You can unblock them anytime in the settings under “Blocked accounts”.`,
    ),
  );
  if (!ok) return false;
  try {
    await setBlocked(target, true);
    window.location.reload();
    return true;
  } catch (err) {
    window.alert(err instanceof Error ? err.message : t("Hat nicht geklappt.", "That didn’t work."));
    return false;
  }
}
