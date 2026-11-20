import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getT } from "@/lib/lang";
import { EditProfileForm } from "@/components/auth/edit-profile-form";
import { SettingsPage } from "@/components/settings/settings-list";

/** Luca 20.11.: wie „Profil bearbeiten“ in den App-Einstellungen — Name, E-Mail, (nur ohne Marke) Profilbild. */
export default async function AccountSettingsPage() {
  const t = await getT();
  const sessionUser = await requireUser();
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!user) redirect("/api/auth/signout?callbackUrl=%2Flogin");
  const brand = await getBrandForUser(sessionUser.id);
  return (
    <SettingsPage title={t("Profil bearbeiten", "Edit profile")}>
      <EditProfileForm initialName={user.name ?? ""} initialEmail={user.email} initialAvatarUrl={user.avatarUrl} brandAccount={Boolean(brand)} />
    </SettingsPage>
  );
}
