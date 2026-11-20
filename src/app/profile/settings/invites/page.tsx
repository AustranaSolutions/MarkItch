import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getT } from "@/lib/lang";
import { getIncomingChallenges, getOutgoingChallenges } from "@/lib/challenge";
import { IncomingChallengeList, OutgoingChallengeList } from "@/components/challenge/challenge-list";
import { SettingsPage } from "@/components/settings/settings-list";

/** Luca 20.11.: Duell-Einladungen als eigene Seite (in der App vom Duelle-Tab aus), nicht mehr in den Einstellungen. */
export default async function InvitesPage() {
  const t = await getT();
  const user = await requireUser();
  const brand = await getBrandForUser(user.id);
  if (!brand) redirect("/pitches");
  const [incoming, outgoing] = await Promise.all([getIncomingChallenges(brand.id), getOutgoingChallenges(brand.id)]);
  return (
    <SettingsPage title={t("Duell-Einladungen", "Duel invites")} back="/pitches">
      <h2 className="mb-2 text-sm font-medium text-zinc-400">{t("Eingehend", "Incoming")}</h2>
      <IncomingChallengeList challenges={incoming} />
      <h2 className="mb-2 mt-6 text-sm font-medium text-zinc-400">{t("Gesendet", "Sent")}</h2>
      <OutgoingChallengeList challenges={outgoing} />
    </SettingsPage>
  );
}
