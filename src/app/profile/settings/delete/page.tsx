import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getT } from "@/lib/lang";
import { DeleteAccountForm } from "@/components/auth/delete-account-form";
import { SettingsPage } from "@/components/settings/settings-list";

export default async function DeleteAccountPage() {
  const t = await getT();
  const user = await requireUser();
  const brand = await getBrandForUser(user.id);
  return (
    <SettingsPage title={t("Account löschen", "Delete account")}>
      <DeleteAccountForm hasBrand={Boolean(brand)} />
    </SettingsPage>
  );
}
