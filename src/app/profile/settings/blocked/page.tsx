import { requireUser } from "@/lib/session";
import { listBlocksFor } from "@/lib/block";
import { BlockedList } from "@/components/profile/blocked-list";
import { BrandSettingsPage } from "@/components/profile/brand-settings-page";

export default async function BlockedSettingsPage() {
  const user = await requireUser();
  const entries = await listBlocksFor(user.id);
  return (
    <BrandSettingsPage title="Blockierte Konten">
      <BlockedList initial={entries} />
    </BrandSettingsPage>
  );
}
