import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getT } from "@/lib/lang";
import { BrandProfileRows, SettingsPage, SettingsSection } from "@/components/settings/settings-list";

/** Luca 20.11.: „Profil bearbeiten“ im eigenen Profil — die vier Bereiche wie in der App. */
export default async function EditProfilePage() {
  const t = await getT();
  const user = await requireUser();
  const brand = await getBrandForUser(user.id);
  if (!brand) redirect("/profile/settings/account");
  return (
    <SettingsPage title={t("Profil bearbeiten", "Edit profile")} back="/profile" card={false}>
      <SettingsSection>
        <BrandProfileRows t={t} />
      </SettingsSection>
    </SettingsPage>
  );
}
