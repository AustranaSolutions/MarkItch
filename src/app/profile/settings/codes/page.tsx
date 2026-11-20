import { requireUser } from "@/lib/session";
import { listSavedCodes } from "@/lib/saved-codes";
import { getSavedFeedItems } from "@/lib/saved-videos";
import { SavedCodeList } from "@/components/profile/saved-code-list";
import { SavedVideoGrid } from "@/components/profile/saved-video-grid";
import { SettingsPage } from "@/components/settings/settings-list";
import { getT } from "@/lib/lang";

// Luca 13.11. (Phase 3): Rabattcodes aus Videos, deren Link man geöffnet hat.
// Luca 17.11.: wie in der App „Für später“ — gemerkte Videos und Codes.
export default async function SavedForLaterPage() {
  const t = await getT();
  const user = await requireUser();
  const [items, codes] = await Promise.all([getSavedFeedItems(user.id), listSavedCodes(user.id)]);
  return (
    <SettingsPage title={t("Für später", "Saved for later")}>
      <h2 className="mb-3 text-sm font-semibold text-white">{t("Videos", "Videos")}</h2>
      <SavedVideoGrid items={items} />
      <h2 className="mb-3 mt-8 text-sm font-semibold text-white">{t("Codes", "Codes")}</h2>
      <SavedCodeList codes={codes} />
    </SettingsPage>
  );
}
