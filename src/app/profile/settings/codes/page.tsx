import { requireUser } from "@/lib/session";
import { listSavedCodes } from "@/lib/saved-codes";
import { SavedCodeList } from "@/components/profile/saved-code-list";
import { BrandSettingsPage } from "@/components/profile/brand-settings-page";
import { getT } from "@/lib/lang";

// Luca 13.11. (Phase 3): Rabattcodes aus Videos, deren Link man geöffnet hat.
export default async function SavedCodesPage() {
  const t = await getT();
  const user = await requireUser();
  const codes = await listSavedCodes(user.id);
  return (
    <BrandSettingsPage title={t("Meine Codes", "My codes")}>
      <SavedCodeList codes={codes} />
    </BrandSettingsPage>
  );
}
