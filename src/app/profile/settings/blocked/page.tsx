import { requireUser } from "@/lib/session";
import { listBlocksFor } from "@/lib/block";
import { BlockedList } from "@/components/profile/blocked-list";
import { BrandSettingsPage } from "@/components/profile/brand-settings-page";
import { getT } from "@/lib/lang";

export default async function BlockedSettingsPage() {
  const t = await getT();
  const user = await requireUser();
  const entries = await listBlocksFor(user.id);
  return (
    <BrandSettingsPage title={t("Blockierte Konten", "Blocked accounts")}>
      <BlockedList initial={entries} />
    </BrandSettingsPage>
  );
}
