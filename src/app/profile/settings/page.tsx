import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { LogoutButton } from "@/components/auth/logout-button";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { isAdminEmail } from "@/lib/moderation";
import { getLangSetting, getT } from "@/lib/lang";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { langOf, localeOf } from "@/lib/i18n";
import { BrandProfileRows, SettingsPage, SettingsRow, SettingsSection } from "@/components/settings/settings-list";
import { InvitesHashRedirect } from "@/components/settings/invites-hash-redirect";

const SUPPORT_EMAIL = "support@markitch.com";

/**
 * Luca 20.11.: Einstellungen wie in der App (settings/index.tsx) — eine Liste,
 * jedes Formular auf einer eigenen Unterseite. Duell-Einladungen liegen jetzt
 * unter /profile/settings/invites (vom Duelle-Tab aus), Castings unter Posten.
 */
export default async function ProfileSettingsPage() {
  const t = await getT();
  const sessionUser = await requireUser();
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!user) redirect("/api/auth/signout?callbackUrl=%2Flogin");

  const brand = await getBrandForUser(sessionUser.id);
  const langSetting = await getLangSetting();

  return (
    <SettingsPage title={t("Einstellungen", "Settings")} back="/profile" card={false}>
      <InvitesHashRedirect />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-orange-500/10 px-2 py-0.5 font-medium text-orange-400">{user.accountType === "acro" ? "Acro" : "Assent"}</span>
        {user.emailVerifiedAt ? (
          <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-medium text-green-400">{t("✓ E-Mail bestätigt", "✓ Email confirmed")}</span>
        ) : (
          <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 font-medium text-yellow-400">{t("E-Mail nicht bestätigt", "Email not confirmed")}</span>
        )}
        <span className="text-zinc-500">
          {t("Mitglied seit", "Member since")} {user.createdAt.toLocaleDateString(localeOf(langOf(t)))}
        </span>
      </div>

      <SettingsSection title="Account">
        <SettingsRow href="/profile/settings/account" label={t("Profil bearbeiten", "Edit profile")} detail={user.name} />
        {!user.emailVerifiedAt ? <ResendVerificationButton row /> : null}
        <SettingsRow href="/profile/settings/password" label={t("Passwort ändern", "Change password")} />
        <SettingsRow href="/profile/settings/codes" label={t("Für später (Videos & Codes)", "Saved for later (videos & codes)")} />
        <SettingsRow href="/profile/settings/notifications" label={t("Benachrichtigungen", "Notifications")} />
        <SettingsRow href="/profile/settings/blocked" label={t("Blockierte Konten", "Blocked accounts")} />
        <div className="flex items-center justify-between px-5 py-2.5 text-sm text-white">
          {t("Sprache", "Language")}
          <LanguageSwitcher setting={langSetting} />
        </div>
      </SettingsSection>

      {brand ? (
        <SettingsSection title={brand.kind === "creator" ? t("Creator-Profil", "Creator profile") : t("Unternehmen", "Business")}>
          <BrandProfileRows name={brand.name} t={t} />
          {!brand.verifiedAt ? <SettingsRow href="/profile/settings/verify" label={t("Konto verifizieren", "Verify account")} /> : null}
        </SettingsSection>
      ) : user.accountType === "acro" ? (
        <SettingsSection title={t("Marke / Creator", "Brand / creator")}>
          <SettingsRow href="/profile" label={t("Profil anlegen", "Create profile")} />
        </SettingsSection>
      ) : null}

      {isAdminEmail(user.email) ? (
        <SettingsSection title="Admin">
          <SettingsRow href="/admin/moderation" label="Moderation" />
          <SettingsRow href="/admin/brands" label="Marken verifizieren" />
          <SettingsRow href="/admin/boosts" label="Boosts" />
          <SettingsRow href="/admin/analytics" label="Analytics" />
          <SettingsRow href="/admin/errors" label="Fehler" />
        </SettingsSection>
      ) : null}

      <SettingsSection title={t("Hilfe", "Help")}>
        <SettingsRow href={`mailto:${SUPPORT_EMAIL}`} label={t("Kontakt & Support", "Contact & support")} detail={SUPPORT_EMAIL} />
      </SettingsSection>

      <SettingsSection title={t("Rechtliches", "Legal")}>
        <SettingsRow href="/impressum" label={t("Impressum", "Legal notice")} />
        <SettingsRow href="/datenschutz" label={t("Datenschutz", "Privacy")} />
        <SettingsRow href="/nutzungsbedingungen" label={t("Nutzungsbedingungen", "Terms of Use")} />
      </SettingsSection>

      <SettingsSection>
        <LogoutButton row />
        <SettingsRow href="/profile/settings/delete" label={t("Account löschen", "Delete account")} danger />
      </SettingsSection>
    </SettingsPage>
  );
}
