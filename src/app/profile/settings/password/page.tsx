import { requireUser } from "@/lib/session";
import { getT } from "@/lib/lang";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { SettingsPage } from "@/components/settings/settings-list";

export default async function PasswordPage() {
  const t = await getT();
  await requireUser();
  return (
    <SettingsPage title={t("Passwort ändern", "Change password")}>
      <ChangePasswordForm />
    </SettingsPage>
  );
}
