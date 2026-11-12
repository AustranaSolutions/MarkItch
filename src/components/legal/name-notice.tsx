import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getBrandForUser } from "@/lib/brand";
import { NameNoticeForm } from "@/components/legal/name-notice-form";
import { getT } from "@/lib/lang";

/**
 * Luca 02.11.: Der Name ist Pflicht — er steht bei Meinungen, Reaktionen und
 * im Zuschauer-Profil. Ältere Konten ohne Namen werden einmal gefragt
 * (Gegenstück zur Abfrage in der App). Marken-Konten zeigen den Markennamen.
 */
export async function NameNotice({ userId }: { userId: string }) {
  const t = await getT();
  const [row] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  if (!row || (row.name ?? "").trim().length >= 2) return null;
  if (await getBrandForUser(userId)) return null;
  return (
    <div
      role="dialog"
      aria-label={t("Name angeben", "Enter your name")}
      className="fixed inset-x-3 top-3 z-[94] mx-auto max-w-lg rounded-2xl border border-orange-500/40 bg-zinc-950 p-4 shadow-xl"
    >
      <p className="text-sm font-semibold text-white">{t("Wie heißt du?", "What’s your name?")}</p>
      <p className="mt-1 text-sm text-zinc-300">
        {t("Dein Name steht bei deinen Meinungen und Reaktionen und in deinem Profil. So wissen andere, wer dahinter steckt.", "Your name appears with your comments, reactions and on your profile, so others know who’s behind them.")}
      </p>
      <NameNoticeForm />
    </div>
  );
}
