import { requireUser } from "@/lib/session";
import { listBlocksFor } from "@/lib/block";
import { BlockedList } from "@/components/profile/blocked-list";
import { SettingsPage } from "@/components/settings/settings-list";
import { getT } from "@/lib/lang";

export default async function BlockedSettingsPage() {
  const t = await getT();
  const user = await requireUser();
  const entries = await listBlocksFor(user.id);
  return (
    <SettingsPage title={t("Blockierte Konten", "Blocked accounts")}>
      <BlockedList initial={entries} />
    </SettingsPage>
  );
}
