import { requireUser } from "@/lib/session";
import { getT } from "@/lib/lang";
import { NotificationToggles } from "@/components/settings/notification-toggles";
import { SettingsPage } from "@/components/settings/settings-list";

export default async function NotificationSettingsPage() {
  const t = await getT();
  await requireUser();
  return (
    <SettingsPage title={t("Benachrichtigungen", "Notifications")}>
      <NotificationToggles />
    </SettingsPage>
  );
}
